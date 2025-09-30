import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, ImageIcon, Download } from "lucide-react";
import React from "react";

const ReceiptsOp = ({ isOpen, onClose, onDownload, uid, txId }) => {
  const handleDownload = async (type) => {
    onDownload(txId, uid, type);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto h-fit bg-card border-border absolute m-auto inset-0 z-[200]">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-lg font-semibold text-card-foreground">
            Download Receipt
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose your preferred format
          </p>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Button
            onClick={() => handleDownload("pdf")}
            variant="outline"
            className="w-full justify-start gap-3 h-12 bg-transparent hover:bg-muted/50"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-left">
              <div className="font-medium text-card-foreground">
                PDF Document
              </div>
              <div className="text-xs text-muted-foreground">
                Printable format
              </div>
            </div>
          </Button>

          <Button
            onClick={() => handleDownload("image")}
            variant="outline"
            className="w-full justify-start gap-3 h-12 bg-transparent hover:bg-muted/50"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-left">
              <div className="font-medium text-card-foreground">
                Image (PNG)
              </div>
              <div className="text-xs text-muted-foreground">Easy to share</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptsOp;
