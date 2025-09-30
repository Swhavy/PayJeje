import { useDispatch } from "react-redux";
import { selectedPrice, billerInfo } from "../Features/userSlice";
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { functions } from "@/firebaseConfig";
import { toast } from "sonner";
import { useSelector } from "react-redux";
const useCloudfunc = () => {
  const user = useSelector((state) => state?.user?.user);
  const { accountReference } = user;
  const dispatch = useDispatch();
  //cloud function to fetch bills
  connectFunctionsEmulator(functions, "localHost", 5001);
  const billsFetch = httpsCallable(functions, "billsFetch");

  //fetch biller details and dispatch network details
  const biller = async (network, productName) => {
    let billerCode = "";
    let itemCode = "";
    if (productName == "Data") {
      switch (network) {
        case "MTN":
          billerCode = "BIL104";
          break;
        case "AIRTEL":
          billerCode = "BIL106";
          break;
        case "GLO":
          billerCode = "BIL105";
          break;
        case "9MOBILE":
          billerCode = "BIL107";
          break;
        default:
          billerCode = "BIL104";
      }
    } else if (productName == "Airtime") {
      switch (network) {
        case "MTN":
          billerCode = "BIL099";
          itemCode = "AT099";
          break;
        case "AIRTEL":
          billerCode = "BIL100";
          itemCode = "AT100";
          break;
        case "GLO":
          billerCode = "BIL102";
          itemCode = "AT102";
          break;
        case "9MOBILE":
          billerCode = "BIL103";
          itemCode = "AT103";
          break;
        default:
          billerCode = "BIL099";
      }
    }

    dispatch(
      selectedPrice({
        network,
        billerCode,
        productName,
        itemCode,
      }),
    );

    try {
      const res = await billsFetch({ billerCode });
      const billsInfo = await res.data.data;
      if (res.data.status !== "error") {
        dispatch(billerInfo({ billsInfo }));
        console.log("Biller details fetched successfully:", res);
        return true;
      } else {
        toast.error("Sorry an error occurred while fetching some data");
        console.log("billsInfo error: ", res);
        return false;
      }
    } catch (error) {
      toast.error("Error fetching biller details");
      console.error("Error fetching biller details:", error);
      return false;
      //setAppContext({ ...appContext, spinner: false })
    }
  };

  const cable = async (price, itemCode, billerCode, productName, network) => {
    //when the user selects the cable provider
    if (price === null && itemCode === null) {
      dispatch(
        selectedPrice({
          network,
          billerCode,
          productName,
        }),
      );
      //provider cable(null, null, billerCode, productName, network);
      //packages cable(price, itemCode, null, null, null);
      try {
        console.log("cables fetch started");
        const res = await billsFetch({ billerCode });
        const billsInfo = await res.data?.data;
        console.log("cables fetch ended", billsInfo);
        if (res.data.status !== "error") {
          dispatch(billerInfo({ billsInfo }));
          console.log("Biller details fetched successfully:", res);
          return true;
        } else {
          toast.error("Sorry an error occurred while fetching some data");
          console.log("billsInfo error: ", res);
          return false;
        }
      } catch (error) {
        toast.error("Error fetching biller details");
        console.error("Error fetching biller details:", error);
        return false;
      }
    }

    //when the user selects the cable package
    else if (billerCode === null && productName === null && network === null) {
      dispatch(
        selectedPrice({
          price,
          itemCode,
        }),
      );
    }
  };

  const getWalletBalance = async (accReference) => {
    let payload;
    const fetchBalance = httpsCallable(functions, "fetchBalance");
    if (!accReference) {
      payload = accountReference;
    } else {
      payload = accReference;
    }
    try {
      const res = await fetchBalance({ accountReference: payload });

      if (res.data.status !== "error") {
        console.log("wallet balance fetched successfully useFunc", res);
        return {
          status: "success",
          walletBalance: res.data.walletBalance,
        };
      } else {
        return {
          status: "error",
          message: res.data.message,
        };
      }
    } catch (error) {
      console.error("caught Error fetching wallet balance:", error);
      return {
        status: "error",
        message: error.message,
      };
    }
  };
  //dispatch network details productName means either Airtime or Mobile Data
  // const dispatchNetworkDet = (network, productName) => {
  //   const billerCode = "";
  //   switch (network) {
  //     case "MTN":
  //       billerCode = "BIL104";
  //       break;
  //     case "AIRTEL":
  //       billerCode = "BIL106";
  //       break;
  //     case "GLO":
  //       billerCode = "BIL105";
  //       break;
  //     case "9MOBILE":
  //       billerCode = "BIL107";
  //       break;
  //     default:
  //       billerCode = "BIL104";
  //   }
  //   dispatch(
  //     selectedPrice({
  //       network,
  //       billerCode,
  //       productName,
  //     }),
  //   );
  // };
  return { biller, cable, getWalletBalance };
};
export default useCloudfunc;
