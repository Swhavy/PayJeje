import { useEffect, useState } from "react";
import { collection, doc, getDocs, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import {db} from "@/firebaseConfig"

import { useSelector } from "react-redux";

const useGetMonthlyTrx = () => {
const user = useSelector(state => state.user.user)
  const [dateLabel, setDateLabels] = useState([])
  const [inflow, setInflow] = useState([])
  const [expenses, setExpenses] = useState([])
 //data manipultion
 
 
    useEffect(() => {
     const now = new Date()
     let year = now.getFullYear()
     let month = now.getMonth()
     let dayData = {}
     let currentDateInLoop = ''
     let inflowArr = []
     let expensesArr = []
     let labels = []
 
     //const dates = new Date(year, month + 1, 0).getDate()
     const dates = new Date().getDate()
 
     for(let day = 1; day <= dates; day++){
       const date = new Date(year, month, day)
 
       const monthName = date.toLocaleDateString("en-US", {month: "short"})
       currentDateInLoop = `${monthName}-${day}`
       dayData[currentDateInLoop] = {inflow:0, expenses:0}
     }
     console.log("day", dayData)
     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
     const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
     const endOfMonthTS = Timestamp.fromDate(endOfMonth)
     const startOfMonthTS = Timestamp.fromDate(startOfMonth)
   const transactionRef = collection(db, "users", user.uid, "Transactions")
   const q = query(transactionRef, where("createdAt", ">=", startOfMonthTS), where("createdAt", "<=", endOfMonthTS), orderBy("createdAt", "asc"))

     
  const onSubscribe = onSnapshot( q, (snapshots) => {
    inflowArr = []
    expensesArr = []
    labels = []

    Object.keys(dayData).forEach((key) => {
    dayData[key].inflow = 0;
    dayData[key].expenses = 0;
  });
   
    

     const transaction = snapshots.docs.map((doc) => ({
       id: doc.id,
        ...doc.data(),
       // Convert Timestamp string to Date object for calculations
       date: new Date(doc.data()["createdAt"].toDate()),
     }))
      console.log("trx", transaction)
     transaction.forEach(trx => {
         const keys = `${trx.date.toLocaleDateString("en-US", {month: "short"})}-${trx.date.getDate()}`
     if(dayData[keys] != undefined){
       if(trx.type === "expenses") dayData[keys].expenses += trx.amount
      else if(trx.type === "inflow") dayData[keys].inflow += trx.amount
      return
     }
     })
    
      Object.keys(dayData).forEach((day) => {
        inflowArr.push(dayData[day].inflow)
        expensesArr.push(dayData[day].expenses)
        labels.push(day)
     })

     //inflow
     setInflow(inflowArr)
     //expenses
     setExpenses(expensesArr)
     //date labels for date
     setDateLabels(labels)
   }, (err) => {
     console.log("an error occured while generating trx data for chart", err)
   })
   return () => onSubscribe()
    }, [user.uid])
    
 
// console.log("inflow", inflow)
// console.log("expenses", expenses)
 
 
  return { inflow, expenses, dateLabel }
 
}

export default useGetMonthlyTrx