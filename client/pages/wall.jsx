import React, { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Sample bank data - replace with your actual data
const sampleBankData = [
  { id: 1, name: "Access Bank", code: "044" },
  { id: 2, name: "GTBank", code: "058" },
  { id: 3, name: "First Bank", code: "011" },
  { id: 4, name: "UBA", code: "033" },
  { id: 5, name: "Zenith Bank", code: "057" },
  { id: 6, name: "Fidelity Bank", code: "070" },
  { id: 7, name: "Union Bank", code: "032" },
  { id: 8, name: "Sterling Bank", code: "232" },
  { id: 9, name: "Wema Bank", code: "035" },
  { id: 10, name: "Polaris Bank", code: "076" },
];

export default function BankCombobox() {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);

  // Replace with your actual bank data
  const bankData = sampleBankData;

  const handleSelect = (bank) => {
    setSelectedValue(bank.name);
    setSelectedBank(bank);
    setOpen(false);
    console.log("Selected Bank:", bank);
    console.log("Bank Code:", bank.code);
    dispatch(selectedPrice({ bankCode: bank.code }));
  };
  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="bank" className="text-sm font-medium">
          Select Your Bank
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="bank"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full h-12 justify-between text-base"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className={cn(!selectedValue && "text-muted-foreground")}>
                  {selectedValue || "Select your bank"}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 bg-black" align="start">
            <Command>
              <CommandInput
                placeholder="Search bank..."
                className="h-12 text-base"
              />
              <CommandEmpty>No bank found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-auto">
                {bankData && bankData.length > 0 ? (
                  bankData.map((bank) => (
                    <CommandItem
                      key={bank.id}
                      value={bank.name}
                      onSelect={() => handleSelect(bank)}
                      className="text-foreground hover:bg-muted cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedValue === bank.name
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{bank.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {bank.code}
                        </span>
                      </div>
                    </CommandItem>
                  ))
                ) : (
                  <CommandItem disabled>No banks available</CommandItem>
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Display selected bank info */}
      {selectedBank && (
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm font-medium">Selected Bank Details:</p>
          <p className="text-sm">Name: {selectedBank.name}</p>
          <p className="text-sm">Code: {selectedBank.code}</p>
        </div>
      )}
    </div>
  );
}
