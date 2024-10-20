import ServiceLocator from "../ServiceLocator";
import Logger from "../Services/Logging/Logger";

const { handleCastVoteEvent } = require('../Controllers/Ballot/castVoteController');
const { handleSendInviteEvent } = require('../Controllers/Election/sendInvitesController');

export default async function registerEvents() {
    const ctx = Logger.createContext("app init");
    Logger.debug(ctx, "registering events");
    const eventQueue = await ServiceLocator.eventQueue();
    eventQueue.subscribe("castVoteEvent", handleCastVoteEvent);
    eventQueue.subscribe("sendInviteEvent", handleSendInviteEvent);
    Logger.debug(ctx, "registering events complete");
}