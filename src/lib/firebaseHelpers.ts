import { db } from './firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { encryptData } from './encryption';

export const syncToFirebase = async (collectionName: string, id: string, data: any, userId: string) => {
  if (!userId) return;
  try {
    // Escreve na subcoleção do usuário para respeitar as regras de segurança do Firestore
    const docRef = doc(db, 'users', userId, collectionName, id);
    const dataToSync = { ...data };
    
    // Remove undefined values
    Object.keys(dataToSync).forEach(key => {
      if (dataToSync[key] === undefined) {
        delete dataToSync[key];
      }
    });

    // Encrypt sensitive fields before sending to Firestore
    if (collectionName === 'records') {
      if (dataToSync.customerName) dataToSync.customerName = encryptData(dataToSync.customerName);
      if (dataToSync.customerPhone) dataToSync.customerPhone = encryptData(dataToSync.customerPhone);
    }
    
    await setDoc(docRef, dataToSync, { merge: true });
  } catch (error) {
    console.error(`Error syncing to Firebase [${collectionName}]:`, error);
  }
};

export const deleteFromFirebase = async (collectionName: string, id: string, userId: string) => {
  if (!userId) return;
  try {
    // Apaga da subcoleção do usuário
    const docRef = doc(db, 'users', userId, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting from Firebase [${collectionName}]:`, error);
  }
};


