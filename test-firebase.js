const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8",
  authDomain: "charlotte-a0d47.firebaseapp.com",
  projectId: "charlotte-a0d47",
  storageBucket: "charlotte-a0d47.firebasestorage.app",
  messagingSenderId: "971007838036",
  appId: "1:971007838036:web:381b5c516ba841fef12ac1"
};

async function testFirebaseConnection() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Testing Firestore connection...');
    const querySnapshot = await getDocs(collection(db, "users"));
    console.log(`✅ Firebase connection successful! Found ${querySnapshot.size} documents in users collection`);

    // Test writing a document
    console.log('Testing write permissions...');
    const { doc, setDoc } = require('firebase/firestore');
    const testDoc = doc(collection(db, "test"));
    await setDoc(testDoc, { test: true, timestamp: new Date() });
    console.log('✅ Write permission successful!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testFirebaseConnection();