import { useEffect, useRef, useCallback } from "react";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { auth } from "../../firebaseConfig";
import { clearState } from "../../Features/userSlice";


const useSessionTimeout = (timeoutMinutes = 30) => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
  const timerRef = useRef(null);
  const SignOut = () => {
      console.log("login out..");
      signOut(auth).then(() => {
        dispatch(clearState({}));
        navigate("/auth/Login");
      });
    };

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      toast.warning("Session expired due to inactivity. Please sign in again.");
      await SignOut();
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes]);

  useEffect(() => {
    // reset timer on any user activity
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer(); // start timer on mount

    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer]);
};

export default useSessionTimeout;