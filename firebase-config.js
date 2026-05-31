const firebaseConfig = {
    apiKey: "AIzaSyCg33eklpGm8f6VhfbBl2rxeDeOTheksU8",
    authDomain: "sheron-maison.firebaseapp.com",
    projectId: "sheron-maison",
    storageBucket: "sheron-maison.firebasestorage.app",
    messagingSenderId: "882571003314",
    appId: "1:882571003314:web:05b500fd4c4804f18350ab",
    measurementId: "G-MQYY0JV247"
};

firebase.initializeApp(firebaseConfig);

if (firebase.analytics) {
    firebase.analytics();
}

const auth = firebase.auth();
const db = firebase.firestore();
