import { createContext, useContext, useState } from 'react'
import FeedbackAlert from '@/components/Alert'

const SpinnerContext = createContext()

const SpinnerProvider = ({ children }) => {
  const [appContext, setAppContext] = useState({
    spinner: false,
  })
  const [alertMsg, setAlertMsg] = useState({
    open: false,
    status: false,
    msg: null,
    statusMsg: null,
  })
  return (
    <SpinnerContext.Provider
      value={{ appContext, setAppContext, alertMsg, setAlertMsg }}
    >
      {children}
      {appContext.spinner && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 backdrop-blur-sm p-4"
        >
          <div className="pw-card px-6 py-5 flex flex-col items-center gap-3 max-w-xs w-full text-center">
            <div className="w-10 h-10 rounded-full border-2 border-border border-t-brand-500 animate-spin" />
            <span className="text-sm font-medium text-foreground">
              Please wait...
            </span>
          </div>
        </div>
      )}
      {alertMsg.open && (
        <FeedbackAlert
          isOpen={alertMsg.open}
          isClose={() =>
            setAlertMsg((prev) => ({ ...prev, open: !alertMsg.open }))
          }
          message={{
            status: alertMsg.status,
            statusMsg: alertMsg.statusMsg,
            message: alertMsg.msg,
          }}
        />
      )}
    </SpinnerContext.Provider>
  );
}

export default SpinnerProvider
export const useSpinner = () => useContext(SpinnerContext)
