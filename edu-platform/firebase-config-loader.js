// Carga firebaseConfig desde firebase-config.js o firebase-config-sample.js
import firebaseConfig from './firebase-config.js'
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';

const app = initializeApp(firebaseConfig);
window.dispatchEvent(new Event('firebase-ready'));
export default app;
