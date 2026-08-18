import { useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, onSnapshot, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAppStore } from '../data/store';
import { decryptData } from './encryption';
import { mapConsultant, mapDailyQueue, mapCRMRecord } from './dataMappers';

export function useFirebaseSync() {
  const currentProjectId = useAppStore(state => state.currentProjectId);

  useEffect(() => {
    let unsubConsultants: () => void;
    let unsubQueues: () => void;
    let unsubRecords: () => void;
    let unsubSuggestions: () => void;

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        useAppStore.setState({ userId: user.uid });
        const targetId = currentProjectId || user.uid;

        // ==========================================
        // 1. LEITURA (FIRESTORE -> APP)
        // ==========================================

        // Sincronizar Consultores
        const qConsultants = collection(db, 'users', targetId, 'consultants');
        unsubConsultants = onSnapshot(qConsultants, (snapshot) => {
          const data: any = {};
          snapshot.forEach((doc) => {
            const docData = doc.data();
            data[doc.id] = mapConsultant(docData, doc.id);
          });
          useAppStore.setState({ consultants: data });
        }, (error) => {
          console.error("🚨 [Firebase] Erro ao sincronizar consultores:", error);
        });

        // Sincronizar Sugestões (suggested_consultants)
        const qSuggestions = collection(db, 'users', targetId, 'suggested_consultants');
        unsubSuggestions = onSnapshot(qSuggestions, (snapshot) => {
          const names: string[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data.name) {
              names.push(data.name);
            }
          });
          useAppStore.setState({ suggestedConsultantNames: names });
        }, (error) => {
          console.error("🚨 [Firebase] Erro ao sincronizar sugestões:", error);
        });

        // Sincronizar Filas Diárias
        const qQueues = collection(db, 'users', targetId, 'dailyQueues');
        unsubQueues = onSnapshot(qQueues, (snapshot) => {
          const data: any = {};
          snapshot.forEach((doc) => {
            const docData = doc.data();
            data[doc.id] = mapDailyQueue(docData, doc.id);
          });
          useAppStore.setState({ dailyQueues: data });
        }, (error) => {
          console.error("🚨 [Firebase] Erro ao sincronizar filas diárias:", error);
        });

        // Sincronizar Atendimentos (Records)
        const qRecords = collection(db, 'users', targetId, 'records');
        unsubRecords = onSnapshot(qRecords, (snapshot) => {
          const data: any = {};
          snapshot.forEach((doc) => {
            const docData = doc.data();
            
            // Decrypt sensitive fields
            if (docData.customerName) docData.customerName = decryptData(docData.customerName);
            if (docData.customerPhone) docData.customerPhone = decryptData(docData.customerPhone);
            
            data[doc.id] = mapCRMRecord(docData, doc.id);
          });
          useAppStore.setState({ records: data });
        }, (error) => {
          console.error("🚨 [Firebase] Erro ao sincronizar atendimentos:", error);
        });

        // ==========================================
        // 2. GRAVAÇÃO É FEITA VIA ACTIONS DO ZUSTAND
        // ==========================================
        // As funções em store.ts já chamam syncToFirebase e deleteFromFirebase.

      } else {
        useAppStore.setState({ userId: null, consultants: {}, dailyQueues: {}, records: {}, suggestedConsultantNames: [] });
        if (unsubConsultants) unsubConsultants();
        if (unsubSuggestions) unsubSuggestions();
        if (unsubQueues) unsubQueues();
        if (unsubRecords) unsubRecords();
      }
    });

    return () => {
      unsubAuth();
      if (unsubConsultants) unsubConsultants();
      if (unsubSuggestions) unsubSuggestions();
      if (unsubQueues) unsubQueues();
      if (unsubRecords) unsubRecords();
    };
  }, [currentProjectId]);
}

