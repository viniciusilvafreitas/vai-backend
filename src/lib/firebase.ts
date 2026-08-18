import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider, 
  FacebookAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut, 
  signInWithPopup, 
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCNhu7wbZGq49jKZK63DY_ztcyyhPpvPPE",
  authDomain: "listadevezoficial.firebaseapp.com",
  projectId: "listadevezoficial",
  storageBucket: "listadevezoficial.firebasestorage.app",
  messagingSenderId: "868834498070",
  appId: "1:868834498070:web:c88ad6c84198b07ea2c737",
  measurementId: "G-Y2L0HTNETX"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to LOCAL immediately
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const googleProvider = new GoogleAuthProvider();

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('instagram_basic');
facebookProvider.addScope('instagram_graph_user_profile');

export { 
  signOut, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber
};
