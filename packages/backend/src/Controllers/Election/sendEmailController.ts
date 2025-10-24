import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { makeEmails } from "../../Services/Email/EmailTemplates"
import { ElectionRoll, ElectionRollAction } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { randomUUID } from "crypto";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { Imsg } from '../../Services/Email/IEmail';

var ElectionRollModel = ServiceLocator.electionRollDb();
var ElectionModel = ServiceLocator.electionsDb();
var EmailService = ServiceLocator.emailService();
const EventQueue = ServiceLocator.eventQueue();

const className = "election.Controllers";

const SendEmailEventQueue = "sendEmailEvent";

export type email_request_data = {
    voter_id?: string,
    recipient_email?: string,
    email: {
        subject: string,
        body: string,
    }
    target: 'all' | 'has_voted' | 'has_not_voted' | 'single' | 'test',
    testEmails?: string[],
}

export type email_request_event = {
    requestId: Uid,
    election_id: string | undefined,
    election: Election | undefined,
    url: string,
    voter_id: string,
    email: {
        subject: string,
        body: string,
    },
    message_id: string,
    sender: string,
    test_email: string // empty string implies it's a real email
}

const makeTestRoll = (election_id: string, email: string) => <ElectionRoll>{
    voter_id: 'test_voter_id',
    election_id: election_id,
    email: email,
    submitted: false,
    state: 'approved',
    create_date: new Date(),
    update_date: new Date(),
    head: true
}

const sendEmailsController = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.sendEmails ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canSendEmails)

    const electionId = req.election.election_id;
    const election = req.election

    const email_request: email_request_data = req.body

    let electionRoll: ElectionRoll[] | null = null
    if (!(req.election.settings.voter_access === 'closed' && req.election.settings.invitation === 'email')) {
        const msg = `Emails not enabled`;
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    let message_id = ''

    if (email_request.target == 'single') {
        let electionRollResponse: ElectionRoll | null = null;

        // When redact_voter_ids is enabled, voter_id is not available, so use recipient_email instead
        if (email_request.voter_id) {
            electionRollResponse = await ElectionRollModel.getByVoterID(electionId, email_request.voter_id, req);
        } else if (email_request.recipient_email) {
            const rolls = await ElectionRollModel.getElectionRoll(electionId, null, email_request.recipient_email, null, req);
            if (rolls && rolls.length > 0) {
                if (rolls.length > 1) {
                    Logger.warn(req, `Multiple voters found with email ${email_request.recipient_email} in election ${electionId}, using first match`);
                }
                electionRollResponse = rolls[0];
            }
        } else {
            const msg = `Either voter_id or recipient_email is required for single target`;
            Logger.info(req, msg);
            throw new BadRequest(msg);
        }

        if (!electionRollResponse) {
            const msg = `Voter not found`;
            Logger.info(req, msg);
            throw new BadRequest(msg)
        }
        electionRoll = [electionRollResponse]
        message_id = `dm_${email_request.voter_id ?? email_request.recipient_email}_${0}` //TODO: retreive count of previous dms
    } else if(email_request.target == 'test'){
        // Create dummy election rolls for each test email
        electionRoll = (email_request.testEmails ?? []).map(email => makeTestRoll(req.election.election_id, email));
    } else {
        electionRoll = await ElectionRollModel.getRollsByElectionID(electionId, req);
        if (!electionRoll) {
            const msg = `No voters found`;
            Logger.info(req, msg);
            throw new BadRequest(msg)
        }
        if (email_request.target == 'has_not_voted') {
            electionRoll = electionRoll.filter(roll => !roll.submitted)
            if (electionRoll.length == 0 || electionRoll == null) {
                const msg = `All voters have voted`;
                Logger.info(req, msg);
                throw new BadRequest(msg)
            }
        } else if (email_request.target == 'has_voted') {
            electionRoll = electionRoll.filter(roll => roll.submitted)
            if (electionRoll.length == 0 || electionRoll == null) {
                const msg = `No voters have voted yet`;
                Logger.info(req, msg);
                throw new BadRequest(msg)
            }
        }
        // Update email campaign count in election db
        election.settings.email_campaign_count = election.settings.email_campaign_count ? election.settings.email_campaign_count + 1 : 1
        await ElectionModel.updateElection(election, req, 'Email Campaign')
        message_id = `campaign_${election.settings.email_campaign_count}`
    }

    const Jobs: email_request_event[] = []
    const reqId = req.contextId ? req.contextId : randomUUID();
    const url = req.protocol + '://' + req.get('host')
    electionRoll.forEach(roll => {
        Jobs.push(
            {
                requestId: reqId,
                election_id: req.election.election_id,
                election: undefined,
                url: url,
                voter_id: roll.voter_id,
                sender: req.user.email,
                email: email_request.email,
                message_id: message_id,
                test_email: email_request.target == 'test' ? (roll.email ?? '') : ''
            }
        )
    })

    var failMsg = "Failed to send invitations";
    try {
        await (await EventQueue).publishBatch(SendEmailEventQueue, Jobs);
    } catch (err: any) {
        const msg = `Could not send invitations`;
        Logger.error(req, `${msg}: ${err.message}`);
        throw new InternalServerError(failMsg)
    }

    res.json({})
}

async function handleSendEmailEvent(job: { id: string; data: email_request_event; }): Promise<void> {
    Logger.info(undefined, `${className}.sendEmailEvent`);
    const event = job.data;
    const ctx = Logger.createContext(event.requestId);

    let election: Election | null;
    if(event.election === undefined){
        election = await ElectionModel.getElectionByID(event.election_id ?? '', ctx)
    }else{
        election = event.election;
    }

    if(election == null){
        throw new InternalServerError(`Could not find election: ${event.election_id}`);
    }

    //Fetch latest entry
    const electionRoll =
        event.test_email!='' ? makeTestRoll(election.election_id, event.test_email) :
        await ElectionRollModel.getByVoterID(election.election_id, event.voter_id, ctx)
    if (!electionRoll) {
        //this should hopefully never happen
        Logger.error(ctx, `Could not find voter ${event.voter_id}`);
        throw new InternalServerError('Could not find voter');
    }
    // await sendEmail(ctx, event.election, electionRoll, event.sender, event.url)
    // TODO: I think this will always give a single element array, we can probably simplify this and be less generalized
    let emails: Imsg[] = makeEmails(election, [electionRoll], event.url, event.email.subject, event.email.body, event.test_email != '');

    let emailResponse;
    try{
        emailResponse = await EmailService.sendEmails(emails)
    }catch(e){
        throw new InternalServerError(`Couldn't send email: ${e}`);
    }

    if(event.test_email) return; // skip the database updates if it's a test email

    const historyUpdate: ElectionRollAction = {
        action_type: event.message_id,
        actor: event.sender,
        timestamp: Date.now(),
        email_data: emailResponse,
    }

    if (electionRoll.history == null) {
        electionRoll.history = [];
    }
    electionRoll.history.push(historyUpdate)

    try {
        const updatedElectionRoll = await ElectionRollModel.update(electionRoll, ctx, `Email Sent`);
        if (!updatedElectionRoll) {
            throw new InternalServerError()
        }
    } catch (err: any) {
        const msg = `Could not update election roll`;
        Logger.error(ctx, `${msg}: ${err.message}`);
        throw new InternalServerError(msg)
    }
}

export {
    handleSendEmailEvent,
    sendEmailsController,
}