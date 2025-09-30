import { createContext, useContext, useState } from "react";
// import SettingsModule from "../Components/Settings Module/SettingsModule";
// import ServiceListingsModule from "./ServiceListingsModule";
// import UserAccountModule from "../Components/Settings Module/UserAccountModule";
// import DataListingsModule from "./DataListingsModule";
// import SecurityModule from "./Settings Module/SecurityModule";
// import PaymentConfirmationModule from "./PaymentConfirmationModule";
// import PaymentSuccessfullModule from "./PaymentSuccessfullModule";
// import PinInput from "./PinInput";
// import BankInfo from "./BankInfo";
// import Electricity from "./Electricity";

const SpinnerContext = createContext();

const SpinnerProvider = ({ children }) => {
  const [appContext, setAppContext] = useState({
    spinner: false,
  });

  return (
    <SpinnerContext.Provider value={{ appContext, setAppContext }}>
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
      {/* {appContext.settings.modalDisplay && (
        <div className="w-full h-screen absolute inset-0 pb-4 bg-black/40 backdrop-blur-md z-50">
          <SettingsModule />
        </div>
      )}
      {appContext.settings.serviceListings && (
        <div className="w-full h-screen absolute inset-0 pb-4 bg-black/40 backdrop-blur-md z-50">
          <ServiceListingsModule />
        </div>
      )}
      {appContext.settings.userAccount && (
        <div className="w-full h-screen absolute inset-0 pb-4 bg-black/40 backdrop-blur-md z-50">
          <UserAccountModule />
        </div>
      )}
      {appContext.data && (
        <div className="w-screen h-screen absolute inset-0 z-50">
          <DataListingsModule />
        </div>
      )}
      {appContext.electricity && (
        <div className="w-screen h-screen absolute inset-0 z-50">
          <Electricity />
        </div>
      )}
      {appContext.settings.securityModule && (
        <div className="w-screen h-screen absolute inset-0 z-50">
          <SecurityModule />
        </div>
      )}
      {appContext.paymentconfirmationmodule && (
        <div className="w-screen h-screen absolute inset-0 z-50">
          <PaymentConfirmationModule />
        </div>
      )}
      {appContext.paymentsuccessfullmodule && (
        <div className="w-screen h-screen absolute inset-0 z-50">
          <PaymentSuccessfullModule />
        </div>
      )}
      {appContext.pinModule && (
        <div className="w-screen h-screen absolute inset-0 z-50">
          <PinInput />
        </div>
      )}
      {appContext.bankInfoModule && (
        <div className="w-screen h-screen absolute inset-0 z-50">
          <BankInfo />
        </div>
      )} */}
    </SpinnerContext.Provider>
  );
};

export default SpinnerProvider;
export const useSpinner = () => useContext(SpinnerContext);
