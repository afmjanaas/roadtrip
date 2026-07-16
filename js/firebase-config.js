/* ================================================================
   PASTE YOUR FIREBASE CONFIG HERE  (see README.md — Step 2)
   Firebase Console → Project settings → Your apps → Web app → Config
   ================================================================ */
export const firebaseConfig = {
  apiKey: "AIzaSyDntiTDCjNPvffKSu9flF-VpyPdsHxB7dM",
  authDomain: "trip-planner-e90bb.firebaseapp.com",
  projectId: "trip-planner-e90bb",
  storageBucket: "trip-planner-e90bb.firebasestorage.app",
  messagingSenderId: "688231491870",
  appId: "1:688231491870:web:fa8855d30be65e392b410f",
  measurementId: "G-VH7S3JB8DD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};
