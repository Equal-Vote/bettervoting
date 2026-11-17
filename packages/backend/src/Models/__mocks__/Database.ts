import { Transaction as KyselyTransaction } from 'kysely';
import { Database } from '../Database';
import TransactionsDB from './Transactions';
import EntitlementsDB from './Entitlements';

// Stands in for Kysely's db.transaction().execute() over the in-memory mock stores:
// if the callback throws, the stores are restored to their state before it ran.
// Only the stores a DB transaction currently spans are snapshotted.
export default class MockDatabase {
    constructor(private transactionsDb: TransactionsDB, private entitlementsDb: EntitlementsDB) {}

    transaction() {
        return {
            execute: async <T>(callback: (trx: KyselyTransaction<Database>) => Promise<T>): Promise<T> => {
                const transactions = structuredClone(this.transactionsDb._transactions);
                const entitlements = structuredClone(this.entitlementsDb._entitlements);
                try {
                    return await callback({} as KyselyTransaction<Database>);
                } catch (err) {
                    this.transactionsDb._transactions = transactions;
                    this.entitlementsDb._entitlements = entitlements;
                    throw err;
                }
            },
        };
    }
}
