import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, fetchSignInMethodsForEmail, sendEmailVerification } from 'firebase/auth';
import { getFirestore, Firestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: any;

  constructor() {
    this.app = initializeApp(environment.firebase); // ✅ Uses environment config
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.storage = getStorage(this.app);
  }

  async registerClient(email: string, password: string, name: string, contactNumber: string, gcashNumber: string): Promise<User | null> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      await setDoc(doc(this.firestore, 'users', user.uid), {
        uid: user.uid,
        role: 'client',
        name,
        contactNumber,
        gcashNumber,
        email,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  async registerCoach(email: string, password: string, name: string, contactNumber: string, gcashNumber: string, professionalId: string, licenseFile: File): Promise<User | null> {
    console.log('Starting coach registration...');
    console.log('Email:', email);
    console.log('Name:', name);
    
    try {
      // 1. First create the auth user
      console.log('1. Creating user in Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      console.log('User created with UID:', user.uid);

      if (!user) {
        throw new Error('Failed to create user account');
      }

      // 2. Send email verification
      console.log('2. Sending email verification...');
      await sendEmailVerification(user);
      console.log('Email verification sent successfully');

      // 3. Prepare user data for Firestore
      const userData = {
        uid: user.uid,
        role: 'coach',
        name,
        email,
        contactNumber,
        gcashNumber,
        professionalId,
        licenseFile: {
          name: licenseFile.name,
          type: licenseFile.type,
          size: licenseFile.size,
          uploadedAt: serverTimestamp()
        },
        isVerified: false,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('3. Saving user data to Firestore...');
      
      // 4. Save to users collection
      const userDocRef = doc(this.firestore, 'users', user.uid);
      console.log('Saving to users collection with doc ID:', user.uid);
      await setDoc(userDocRef, userData);
      console.log('Successfully saved to users collection');
      
      // 5. Also save to coaches collection for easier querying
      const coachData = {
        ...userData,
        userId: user.uid
      };
      
      const coachDocRef = doc(this.firestore, 'coaches', professionalId);
      console.log('Saving to coaches collection with doc ID:', professionalId);
      await setDoc(coachDocRef, coachData);
      console.log('Successfully saved to coaches collection');

      return user;
    } catch (error) {
      console.error('Error registering coach:', error);
      
      // Re-throw the error with a more user-friendly message
      if (error instanceof Error) {
        throw error; // This will preserve the original error with its code
      }
      
      throw new Error('Failed to register coach. Please try again.');
    }
  }

  async login(email: string, password: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async getUserProfile(uid: string) {
    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
  }

  async getUserRole(uid: string): Promise<string | null> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data['role'] || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return null;
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const methods = await fetchSignInMethodsForEmail(this.auth, email);
      return methods.length > 0;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  }

  // Add method to update verification status in Firestore
  async updateEmailVerificationStatus(uid: string, isVerified: boolean): Promise<void> {
    try {
      await updateDoc(doc(this.firestore, 'users', uid), {
        isVerified: isVerified,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating email verification status:', error);
      throw error;
    }
  }

  // Add method to check if user's email is verified
  async isEmailVerified(uid: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data['isVerified'] || false;
      }
      return false;
    } catch (error) {
      console.error('Error checking email verification status:', error);
      return false;
    }
  }

  // Add method to resend verification email
  async resendVerificationEmail(): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
      } else {
        throw new Error('No unverified user found or email already verified');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  }
}
