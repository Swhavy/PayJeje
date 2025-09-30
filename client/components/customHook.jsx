import { useState } from "react";
import { useSpinner } from "./SpinnerProvider";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";

export const useSetting = () => {
  const { setAppContext, appContext } = useSpinner();
  const setContext = (key, value) => {
    setAppContext({
      ...appContext,
      settings: {
        ...appContext.settings,
        [key]: value,
      },
    });
  };

  const updateDB = async (key, value) => {
    const auth = getAuth();

    try {
      //get Info about the current User
      const user = auth.currentUser;
      const userUID = user.uid;

      //reference to the user's document
      const userRef = doc(db, "users", userUID);

      const userData = {
        [key]: value,
      };

      setDoc(userRef, userData, { merge: true });

      console.log("database Updated successfully");
    } catch (error) {
      console.log("An error occurred while updating the database: ", error);
      toast.error("an error occurred while updating your details");
    }
  };
  return { setContext, updateDB };
};
