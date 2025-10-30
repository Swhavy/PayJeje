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
        <div className="spin w-screen h-screen  overflow-hidden bg-black/40 backdrop-blur-md absolute top-0 z-50 flex flex-auto gap-5">
          <div className="w-32 h-32 absolute inset-0 m-auto rounded-full border-2 border-gray-500 border-t-orange-500 border-l-blue-500 border-b-green-400 animate-spin"></div>
          {console.log("Spinner active")}
          <span className="sticky top-[50%] text-white m-auto inset-0 Z-index">
            Please wait...
          </span>
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
