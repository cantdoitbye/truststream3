/**
 * Firebase Database Provider
 * Implementation of database abstraction for Firebase Firestore
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { 
  DatabaseConfig,
  QueryOptions,
  TransactionOperation,
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError
} from '../../../shared-utils/database-interface';
import { BaseDatabaseProvider } from './BaseDatabaseProvider';

export class FirebaseDatabaseProvider extends BaseDatabaseProvider {
  private app: FirebaseApp | null = null;
  private firestore: Firestore | null = null;

  async createRawConnection(): Promise<Firestore> {
    if (!this.config.firebase) {
      throw new ConnectionError('Firebase configuration is missing');
    }

    // Initialize Firebase app if not already initialized
    const existingApp = getApps().find(app => app.name === this.config.firebase?.projectId);
    
    if (existingApp) {
      this.app = existingApp;
    } else {
      this.app = initializeApp({
        apiKey: this.config.firebase.apiKey,
        authDomain: this.config.firebase.authDomain,
        projectId: this.config.firebase.projectId,
        storageBucket: this.config.firebase.storageBucket,
        messagingSenderId: this.config.firebase.messagingSenderId,
        appId: this.config.firebase.appId
      }, this.config.firebase.projectId);
    }

    const firestore = getFirestore(this.app);
    
    // Test connection
    try {
      await getDoc(doc(firestore, '_test', 'connection'));
    } catch (error) {
      throw new ConnectionError(`Failed to connect to Firebase: ${error}`);
    }

    return firestore;
  }

  async validateConnection(firestore: Firestore): Promise<boolean> {
    try {
      await getDoc(doc(firestore, '_test', 'connection'));
      return true;
    } catch {
      return false;
    }
  }

  async closeRawConnection(firestore: Firestore): Promise<void> {
    // Firestore connections are automatically managed
    // No explicit closing needed
  }

  async executeRawQuery(firestore: Firestore, queryStr: string, params?: any[]): Promise<any> {
    // Firebase doesn't support raw SQL queries
    // This would need to be implemented with Firestore query syntax
    throw new QueryError('Raw SQL queries not supported in Firestore', queryStr);
  }

  async beginRawTransaction(firestore: Firestore): Promise<string> {
    // Firebase transactions are handled differently
    // Return a transaction ID for tracking
    return `firebase_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async commitRawTransaction(firestore: Firestore, transactionId: string): Promise<void> {
    // Firebase handles transactions automatically within runTransaction
    // This is a no-op for Firebase
  }

  async rollbackRawTransaction(firestore: Firestore, transactionId: string): Promise<void> {
    // Firebase handles rollbacks automatically within runTransaction
    // This is a no-op for Firebase
  }

  // CRUD Implementation
  protected async executeCreate(firestore: Firestore, table: string, data: any): Promise<any> {
    try {
      const collectionRef = collection(firestore, table);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const doc = await getDoc(docRef);
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new QueryError(`Failed to create document in ${table}: ${error}`);
    }
  }

  protected async executeRead(firestore: Firestore, table: string, queryOptions?: QueryOptions): Promise<any[]> {
    try {
      let firestoreQuery = collection(firestore, table);
      let q = query(firestoreQuery);

      // Apply where conditions
      if (queryOptions?.where) {
        for (const condition of queryOptions.where) {
          switch (condition.operator) {
            case 'eq':
              q = query(q, where(condition.column, '==', condition.value));
              break;
            case 'neq':
              q = query(q, where(condition.column, '!=', condition.value));
              break;
            case 'gt':
              q = query(q, where(condition.column, '>', condition.value));
              break;
            case 'gte':
              q = query(q, where(condition.column, '>=', condition.value));
              break;
            case 'lt':
              q = query(q, where(condition.column, '<', condition.value));
              break;
            case 'lte':
              q = query(q, where(condition.column, '<=', condition.value));
              break;
            case 'in':
              q = query(q, where(condition.column, 'in', condition.values || []));
              break;
            case 'not_in':
              q = query(q, where(condition.column, 'not-in', condition.values || []));
              break;
          }
        }
      }

      // Apply ordering
      if (queryOptions?.orderBy) {
        q = query(q, orderBy(queryOptions.orderBy.column, queryOptions.orderBy.direction.toLowerCase() as 'asc' | 'desc'));
      }

      // Apply limit
      if (queryOptions?.limit) {
        q = query(q, limit(queryOptions.limit));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new QueryError(`Failed to read from ${table}: ${error}`);
    }
  }

  protected async executeUpdate(firestore: Firestore, table: string, id: string, data: any): Promise<any> {
    try {
      const docRef = doc(firestore, table, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
      
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      throw new QueryError(`Failed to update document ${id} in ${table}: ${error}`);
    }
  }

  protected async executeDelete(firestore: Firestore, table: string, id: string): Promise<boolean> {
    try {
      const docRef = doc(firestore, table, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      throw new QueryError(`Failed to delete document ${id} from ${table}: ${error}`);
    }
  }

  protected async executeCount(firestore: Firestore, table: string, queryOptions?: QueryOptions): Promise<number> {
    // Firestore doesn't have a direct count operation
    // We need to fetch all documents and count them
    const results = await this.executeRead(firestore, table, queryOptions);
    return results.length;
  }

  public getProviderCapabilities() {
    return {
      database: {
        supportsTransactions: true,
        supportsReplication: true,
        supportsSharding: true,
        supportsBackup: true,
        maxConnections: 1000000,
        supportedFeatures: ['realtime', 'offline', 'security-rules']
      },
      auth: {
        supportsMFA: true,
        supportsSSO: true,
        supportsSocialAuth: true,
        supportsRoleManagement: true,
        maxSessions: 1000000,
        supportedProviders: ['email', 'google', 'facebook', 'twitter', 'github']
      },
      storage: {
        supportsVersioning: false,
        supportsEncryption: true,
        supportsCDN: true,
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
        supportedFormats: ['*']
      },
      realtime: {
        supportsChannels: true,
        supportsPresence: true,
        maxConcurrentConnections: 100000,
        supportedProtocols: ['websocket']
      },
      edgeFunctions: {
        supportsScheduling: true,
        supportsWebhooks: true,
        maxExecutionTime: 60000,
        supportedRuntimes: ['node.js']
      }
    };
  }
}