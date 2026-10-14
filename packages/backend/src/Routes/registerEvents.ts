
import ServiceLocator from "../ServiceLocator";
import Logger from "../Services/Logging/Logger";
import { EventHandler } from "../Services/EventQueue/IEventQueue";
import { handleCastVoteEvent } from '../Controllers/Ballot/castVoteController';
import { handleSendInviteEvent } from '../Controllers/Election/sendInvitesController';
import { handleSendEmailEvent } from '../Controllers/Election/sendEmailController';
import { handlePruneEmailEvents, PRUNE_EMAIL_EVENTS_CRON, PruneEmailEventsQueue } from '../Services/Email/pruneEmailEvents';
import { getErrorMessage } from '../errorUtils';

export default async function registerEvents() {
    const ctx = Logger.createContext("app init");
    Logger.debug(ctx, "registering events");
    const eventQueue = await ServiceLocator.eventQueue();
    // Each handler's `data` is typed to its specific event shape (CastVoteEvent, etc.), narrower
    // than EventHandler's generic `data: object` — cast rather than widen the shared subscribe() signature.
    eventQueue.subscribe("castVoteEvent", handleCastVoteEvent as EventHandler);
    eventQueue.subscribe("sendInviteEvent", handleSendInviteEvent as EventHandler);
    eventQueue.subscribe("sendEmailEvent", handleSendEmailEvent as EventHandler);
    eventQueue.subscribe(PruneEmailEventsQueue, handlePruneEmailEvents);
    try {
        await eventQueue.schedule(PruneEmailEventsQueue, PRUNE_EMAIL_EVENTS_CRON);
    } catch (err: unknown) {
        // Old events piling up for a while is harmless; don't stop the app over it.
        Logger.error(ctx, `Could not schedule ${PruneEmailEventsQueue}: ${getErrorMessage(err)}`);
    }
    Logger.debug(ctx, "registering events complete");
}