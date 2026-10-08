import { Transaction } from '@equal-vote/star-vote-shared/domain_model/Transaction';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';
import { Transaction as KyselyTransaction } from 'kysely';
import { Database } from '../Database';

export default class TransactionsDB {

    _transactions: Transaction[] = [];
    _nextId = 1;

    async insert(transaction: Omit<Transaction, 'id'>, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `MockTransactions insert stripe_checkout_session_id=${transaction.stripe_checkout_session_id}`);
        this._transactions.push({ ...transaction, id: this._nextId++ });
    }

    async getByStripeSessionId(stripe_checkout_session_id: string, _ctx: ILoggingContext): Promise<Transaction | null> {
        return this._transactions.find(t => t.stripe_checkout_session_id === stripe_checkout_session_id) ?? null;
    }

    async markComplete(stripe_checkout_session_id: string, _ctx: ILoggingContext, _trx: KyselyTransaction<Database>): Promise<void> {
        const transaction = this._transactions.find(t => t.stripe_checkout_session_id === stripe_checkout_session_id);
        if (transaction) {
            transaction.status = 'complete';
            transaction.completed_date = new Date().toISOString();
        }
    }

    async markExpired(stripe_checkout_session_id: string, _ctx: ILoggingContext): Promise<void> {
        const transaction = this._transactions.find(t => t.stripe_checkout_session_id === stripe_checkout_session_id);
        if (transaction) {
            transaction.status = 'expired';
        }
    }
}
