import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Database } from 'firebase/database';

declare global {
  interface Window {
    firebaseApp: FirebaseApp;
    firebaseAuth: Auth;
    firebaseFirestore: Firestore;
    firebaseDatabase: Database;
  }
}
