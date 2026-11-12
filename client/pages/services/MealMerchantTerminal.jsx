import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ScanLine,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Receipt,
  Check,
  Copy,
  RefreshCw,
  Search,
  ShieldCheck,
  Building,
  AlertCircle,
  ArrowRight,
  Camera,
  CameraOff,
  SwitchCamera,
  Upload,
  X,
  Sparkles,
  Key,
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import useCloudfunc from "@/components/useCloudfunc";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { auth, db } from "@/firebaseConfig";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";

export default function MealMerchantTerminal() {
  const user = useSelector((state) => state.user?.user || {});
  const currentUid = user?.uid || auth.currentUser?.uid;

  const {
    validateMealVoucherForMerchant,
    redeemMealVoucherMerchant,
  } = useCloudfunc();

  // Active Merchant & Cashier Session
  const [selectedVendorId, setSelectedVendorId] = useState(user?.vendorId || null);
  const [cashierBranch, setCashierBranch] = useState(user?.vendorBranch || "Main Branch");
  const [cashierName, setCashierName] = useState(user?.cashierName || user?.userName || "Assigned Cashier");
  const [cashierRoleActive, setCashierRoleActive] = useState(user?.role === "vendor" || user?.role === "admin");
  const [isAdmin, setIsAdmin] = useState(user?.role === "admin" || user?.isAdmin === true);

  // Authoritative Vendor Profile from Firestore
  const [vendorData, setVendorData] = useState(null);

  // Authoritative real-time sync with user's Firestore profile
  useEffect(() => {
    let unSubDoc = null;

    const setupListener = (uid) => {
      if (!uid) return;
      const userRef = doc(db, "users", uid);
      unSubDoc = onSnapshot(userRef, async (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const role = d.role || "user";
          const adminFlag = role === "admin" || d.isAdmin === true;
          setIsAdmin(adminFlag);

          if (role === "vendor" && d.vendorId) {
            setCashierRoleActive(true);
            setSelectedVendorId(d.vendorId);
            if (d.vendorBranch) setCashierBranch(d.vendorBranch);
            if (d.cashierName) setCashierName(d.cashierName);
            else if (d.userName) setCashierName(d.userName);

            // Fetch vendor entity
            try {
              const vSnap = await getDoc(doc(db, "meal_vendors", d.vendorId));
              if (vSnap.exists()) {
                setVendorData({ id: d.vendorId, ...vSnap.data() });
              } else {
                setVendorData({ id: d.vendorId, name: d.vendorId, branches: [d.vendorBranch || "Main Branch"] });
              }
            } catch (err) {
              console.error("Failed to load vendor profile:", err);
            }
          } else if (adminFlag) {
            setCashierRoleActive(true);
            if (d.vendorId) {
              setSelectedVendorId(d.vendorId);
              try {
                const vSnap = await getDoc(doc(db, "meal_vendors", d.vendorId));
                if (vSnap.exists()) {
                  setVendorData({ id: d.vendorId, ...vSnap.data() });
                }
              } catch (err) {}
            }
          } else {
            setCashierRoleActive(false);
          }
        }
      });
    };

    if (currentUid) {
      setupListener(currentUid);
    } else {
      const unSubAuth = auth.onAuthStateChanged((fbUser) => {
        if (fbUser?.uid) {
          setupListener(fbUser.uid);
        }
      });
      return () => {
        unSubAuth();
        if (unSubDoc) unSubDoc();
      };
    }

    return () => {
      if (unSubDoc) unSubDoc();
    };
  }, [currentUid]);

  // Voucher Lookup & Input
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [customerClaimPin, setCustomerClaimPin] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Bill Amount & Calculation
  const [billAmountInput, setBillAmountInput] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(null);
  const [redemptionError, setRedemptionError] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Live QR Code Camera Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerFacingMode, setScannerFacingMode] = useState("environment"); // "environment" | "user"
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [scannerError, setScannerError] = useState(null);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const html5QrCodeRef = useRef(null);
  const qrFileInputRef = useRef(null);

  const selectedVendor = vendorData || {
    id: selectedVendorId || "merchant",
    name: vendorData?.name || selectedVendorId || "PayWaka Merchant",
    branch: cashierBranch,
    logoEmoji: vendorData?.logoEmoji || "🍗",
    logoUrl: vendorData?.logoUrl || null,
  };

  // Perform Server-Side Voucher Validation
  const executeVoucherValidation = async (codeToValidate) => {
    const cleanCode = (codeToValidate || voucherCodeInput).trim().toUpperCase();
    if (!cleanCode) {
      toast.warning("Please enter or scan a voucher code.");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setValidationError(null);
    setRedemptionSuccess(null);
    setRedemptionError(null);

    try {
      const res = await validateMealVoucherForMerchant({
        voucherCodeOrId: cleanCode,
        vendorId: selectedVendorId,
      });

      if (res?.success) {
        setValidationResult(res);
        // Pre-fill minimum spend if bill amount is empty
        if (!billAmountInput && res.voucher?.minSpendNaira) {
          setBillAmountInput(String(res.voucher.minSpendNaira));
        }
        toast.success("Voucher verified!", {
          description: `₦${res.voucher.discountNaira.toLocaleString()} discount ready to apply.`,
        });
      } else {
        throw new Error(res?.message || "Validation failed.");
      }
    } catch (err) {
      console.error("Voucher validation error:", err);
      const friendly =
        err?.message?.replace(/^FirebaseError:\s*/, "") ||
        "Could not validate voucher. Please check the code and try again.";
      setValidationError(friendly);
      toast.error(friendly);
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateVoucher = (e) => {
    if (e) e.preventDefault();
    executeVoucherValidation(voucherCodeInput);
  };

  // Safe helper to stop & clear Html5Qrcode without ever throwing synchronous "Cannot stop, scanner is not running or paused"
  const safeStopScanner = async (instance) => {
    if (!instance) return;
    try {
      const state = typeof instance.getState === "function" ? instance.getState() : null;
      if (instance.isScanning || state === 2 || state === 3) {
        await instance.stop();
      }
    } catch (_) {
      // Ignore stop errors if scanner had not entered RUNNING/PAUSED state
    }
    try {
      instance.clear();
    } catch (_) {}
  };

  const handleDecodedQrText = async (decodedText, scannerInstance) => {
    if (navigator.vibrate) navigator.vibrate(100);

    let code = String(decodedText || "").trim();
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.voucherCode) code = parsed.voucherCode;
      else if (parsed.code) code = parsed.code;
    } catch (_) {}

    const normalizedCode = code.toUpperCase();
    setVoucherCodeInput(normalizedCode);
    toast.success(`QR Scanned: ${normalizedCode}`);

    await safeStopScanner(scannerInstance || html5QrCodeRef.current);
    html5QrCodeRef.current = null;
    setIsScannerOpen(false);
    executeVoucherValidation(normalizedCode);
  };

  // QR Camera Scanner Controller (with multi-camera enumeration & PC/Mobile fallback)
  useEffect(() => {
    let isCancelled = false;

    if (!isScannerOpen) {
      return undefined;
    }

    setScannerError(null);

    const timer = setTimeout(async () => {
      if (isCancelled) return;

      // Check browser mediaDevices support (Mobile browsers block live getUserMedia on non-HTTPS LAN IPs)
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        setScannerError(
          "Live video streaming is blocked by your mobile browser on non-HTTPS connections. Use 'Snap QR with Phone Camera' below to scan immediately!"
        );
        return;
      }

      try {
        await safeStopScanner(html5QrCodeRef.current);
        const html5QrCode = new Html5Qrcode("terminal-qr-reader");
        html5QrCodeRef.current = html5QrCode;

        const scanConfig = {
          fps: 12,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0,
        };

        let cameras = [];
        try {
          cameras = (await Html5Qrcode.getCameras()) || [];
        } catch (_) {
          cameras = [];
        }

        if (isCancelled) {
          await safeStopScanner(html5QrCode);
          return;
        }

        setAvailableCameras(cameras);

        const onScanSuccess = (decodedText) => {
          handleDecodedQrText(decodedText, html5QrCode);
        };

        // Determine best camera constraint
        const startWithTimeout = (target, config, onSuccess, onError, timeoutMs = 6000) => {
          return Promise.race([
            html5QrCode.start(target, config, onSuccess, onError),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Camera initialization timed out.")), timeoutMs)
            ),
          ]);
        };

        if (cameras.length === 1) {
          // Single-camera device (e.g. PC laptop webcam): bind directly to its ID so it never fails on 'environment'
          await startWithTimeout(cameras[0].id, scanConfig, onScanSuccess, () => {});
        } else if (cameras.length > 1) {
          const safeIdx = selectedCameraIndex < cameras.length ? selectedCameraIndex : 0;
          await startWithTimeout(cameras[safeIdx].id, scanConfig, onScanSuccess, () => {});
        } else {
          // Fallback to facingMode with automatic user-camera fallback
          try {
            await startWithTimeout({ facingMode: scannerFacingMode }, scanConfig, onScanSuccess, () => {});
          } catch (_) {
            const fallbackMode = scannerFacingMode === "environment" ? "user" : "environment";
            await startWithTimeout({ facingMode: fallbackMode }, scanConfig, onScanSuccess, () => {});
          }
        }
      } catch (err) {
        console.error("QR Scanner initialization error:", err);
        if (!isCancelled) {
          setScannerError(
            "Live camera stream unavailable or timed out. Tap 'Snap QR with Phone Camera' below or type the code manually."
          );
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      const instance = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      safeStopScanner(instance);
    };
  }, [isScannerOpen, scannerFacingMode, selectedCameraIndex]);

  const toggleCameraFacingMode = async () => {
    if (availableCameras.length <= 1) {
      toast.info("Only 1 camera was detected on this device.");
      return;
    }

    const instance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    await safeStopScanner(instance);

    if (availableCameras.length > 1) {
      setSelectedCameraIndex((prev) => (prev + 1) % availableCameras.length);
    } else {
      setScannerFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    }
  };

  const handleCloseScanner = async () => {
    const instance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    await safeStopScanner(instance);
    setIsScannerOpen(false);
  };

  // Helper to downscale huge smartphone camera photos (12MP-50MP) before feeding to Html5Qrcode.
  // This prevents mobile browsers from crashing/reloading due to high memory canvas allocation.
  const downscaleImageForQrScan = (file, maxDimension = 1000) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith("image/")) {
        return resolve(file);
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension) {
          return resolve(file);
        }
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        try {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              const downscaledFile = new File([blob], file.name || "qr_snap.jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(downscaledFile);
            },
            "image/jpeg",
            0.85
          );
        } catch (_) {
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  };

  // Native Phone Camera / Image File QR Decoder (works even on HTTP LAN on mobile phones!)
  const handleQrImageFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    setScannerError(null);

    try {
      const liveInstance = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      await safeStopScanner(liveInstance);

      // Downscale photo on an offscreen canvas to avoid mobile OOM tab crash
      const optimizedFile = await downscaleImageForQrScan(file, 1000);

      const fileScanner = new Html5Qrcode("terminal-qr-reader");
      const decodedText = await fileScanner.scanFile(optimizedFile, false);
      try {
        fileScanner.clear();
      } catch (_) {}

      await handleDecodedQrText(decodedText, null);
    } catch (err) {
      console.error("QR Image scan error:", err);
      setScannerError(
        "Could not detect a clear QR code in that photo. Please hold the camera steady over the QR code and try again."
      );
      toast.error("No QR code detected in photo. Try again or enter the 4-character voucher code manually.");
    } finally {
      setIsScanningFile(false);
      if (e.target) e.target.value = "";
    }
  };

  // Bill & PIN Calculations
  const billAmount = Number(billAmountInput || 0);
  const minSpend = Number(validationResult?.voucher?.minSpendNaira || 0);
  const nominalDiscount = Number(validationResult?.voucher?.discountNaira || 0);
  const actualDiscount = Math.min(nominalDiscount, billAmount);
  const finalPayable = Math.max(0, billAmount - actualDiscount);
  const isBillValid = billAmount >= minSpend && billAmount > 0;
  const isPinValid = /^\d{4}$/.test(customerClaimPin.trim());
  const canSettle = isBillValid && isPinValid;

  // Execute Final Atomic Redemption
  const handleExecuteRedemption = async () => {
    if (!validationResult?.voucher || !canSettle) return;

    setIsRedeeming(true);
    setRedemptionError(null);

    try {
      const idempotencyKey = `red_${selectedVendorId}_${validationResult.voucher.id}_${Date.now()}`;
      const res = await redeemMealVoucherMerchant({
        voucherCodeOrId: validationResult.voucher.id,
        vendorId: selectedVendorId,
        vendorBranch: cashierBranch,
        billAmountNaira: billAmount,
        voucherPin: customerClaimPin.trim() || undefined,
        idempotencyKey,
      });

      if (res?.success) {
        setRedemptionSuccess(res);
        setShowConfirmModal(false);
        setValidationResult(null);
        setVoucherCodeInput("");
        setCustomerClaimPin("");
        toast.success("Meal Voucher successfully redeemed!");
      } else {
        throw new Error(res?.message || "Failed to redeem voucher.");
      }
    } catch (err) {
      console.error("Redemption error:", err);
      const friendly =
        err?.message?.replace(/^FirebaseError:\s*/, "") ||
        "Redemption failed. Please verify the bill total and PIN.";
      setRedemptionError(friendly);
      toast.error(friendly);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleResetTerminal = () => {
    setValidationResult(null);
    setValidationError(null);
    setRedemptionSuccess(null);
    setRedemptionError(null);
    setVoucherCodeInput("");
    setCustomerClaimPin("");
    setBillAmountInput("");
  };

  return (
    <MerchantLayout
      activeTab="terminal"
      vendorInfo={selectedVendor}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Terminal Sub-Header & Live Operational Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1b202e]">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <ScanLine className="w-6 h-6 text-emerald-400" />
              <span>Cashier Redemption POS</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live counter verification, customer QR scanning, and atomic settlement.
            </p>
          </div>

          <Link
            to="/merchant/meals"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-xs font-semibold text-zinc-300 hover:text-white transition shadow-sm"
          >
            <span>View Marketing Campaigns</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </Link>
        </div>

        {/* CASHIER OPERATIONAL STATUS BAR */}
        <div className="w-full bg-[#0e111a] border border-[#1c2233] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner overflow-hidden">
              {selectedVendor.logoUrl ? (
                <img src={selectedVendor.logoUrl} alt={selectedVendor.name} className="w-full h-full object-cover" />
              ) : (
                <span>{selectedVendor.logoEmoji || "🍗"}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {selectedVendor.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    cashierRoleActive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cashierRoleActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                    }`}
                  />
                  {cashierRoleActive ? "POS Ready" : "Terminal Inactive"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-300">{cashierBranch}</span>
                <span className="text-zinc-600">•</span>
                <span>Staff: <strong className="text-zinc-200 font-semibold">{cashierName}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40 active:scale-95 flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Customer QR</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            LIVE CAMERA QR SCANNER VIEWPORT MODAL
            ========================================================================= */}
        {isScannerOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#0e111a] border border-[#202738] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Live Customer QR Scanner</h3>
                    <p className="text-[11px] text-zinc-400">Aim camera at customer voucher ticket</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {availableCameras.length > 1 ? (
                    <button
                      onClick={toggleCameraFacingMode}
                      className="p-2 rounded-lg bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-zinc-400 hover:text-white transition"
                      title="Flip Camera (Front/Rear)"
                      aria-label="Flip Camera"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  ) : availableCameras.length === 1 ? (
                    <span className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-800/60 rounded border border-zinc-700/50 select-none">
                      1 Cam
                    </span>
                  ) : null}
                  <button
                    onClick={handleCloseScanner}
                    className="p-2 rounded-lg bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-zinc-400 hover:text-white transition"
                    title="Close Scanner"
                    aria-label="Close Scanner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="relative w-full aspect-square max-h-[320px] rounded-2xl overflow-hidden bg-black border border-[#23293a] flex items-center justify-center">
                <div id="terminal-qr-reader" className="w-full h-full object-cover" />

                {/* Laser Sweep Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-0 animate-[bounce_2s_ease-in-out_infinite]" />
                  </div>
                </div>
              </div>

              {scannerError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-200">
                  {scannerError}
                </div>
              )}

              {/* Mobile Phone Native Camera / QR Photo Capture Fallback (No capture="environment" to prevent OS tab kill) */}
              <input
                type="file"
                ref={qrFileInputRef}
                onChange={handleQrImageFileScan}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => qrFileInputRef.current?.click()}
                disabled={isScanningFile}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
              >
                {isScanningFile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Decoding QR Photo...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Snap QR with Phone Camera / Upload Image</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                <span>Hold voucher ticket steady</span>
                <button
                  onClick={handleCloseScanner}
                  className="font-bold text-zinc-300 hover:text-white"
                >
                  Cancel / Type Manually
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REDEMPTION SUCCESS STATE */}
        {redemptionSuccess && (
          <div className="w-full bg-[#0a1610] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-[0_8px_32px_rgba(16,185,129,0.15)] animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Redemption Settled
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-2">
                ₦{(redemptionSuccess.discountNaira ?? redemptionSuccess.discountAppliedNaira ?? 0).toLocaleString()} Discount Applied
              </h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Customer voucher verified and discount deducted from final bill.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="w-full max-w-md bg-[#090b10] border border-[#1b202e] rounded-2xl p-5 flex flex-col gap-3 text-xs text-left shadow-inner">
              <div className="flex justify-between items-center pb-2 border-b border-[#1b202e]">
                <span className="text-zinc-500">Transaction Ref</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-white">
                    {redemptionSuccess.redemptionReference}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(redemptionSuccess.redemptionReference);
                      setCopiedRef(true);
                      toast.success("Reference copied");
                      setTimeout(() => setCopiedRef(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-[#141824] text-zinc-400 hover:text-white"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">Gross Bill</span>
                <span className="font-bold text-zinc-300">
                  ₦{redemptionSuccess.billAmountNaira?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span className="font-medium">Promotional Discount</span>
                <span className="font-black">
                  -₦{(redemptionSuccess.discountNaira ?? redemptionSuccess.discountAppliedNaira ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#1b202e] text-sm font-bold text-white">
                <span>Customer Amount Due:</span>
                <span className="text-xl font-black text-emerald-400">
                  ₦{redemptionSuccess.finalPayableNaira?.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetTerminal}
              className="w-full max-w-md py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Next Customer in Queue</span>
            </button>
          </div>
        )}

        {/* MAIN VOUCHER LOOKUP & COUNTER VERIFICATION FORM */}
        {!redemptionSuccess && (
          <div className="w-full bg-[#0e111a] border border-[#1c2233] rounded-3xl p-5 sm:p-7 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-emerald-400" />
                  <span>Customer Voucher Lookup</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Scan customer QR or enter ticket voucher code manually.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-xs font-bold text-emerald-400 transition"
              >
                <Camera className="w-4 h-4" />
                <span>Open Scanner</span>
              </button>
            </div>

            <form onSubmit={handleValidateVoucher} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter PWK-XXXX-YYYY or Voucher Code..."
                  className="w-full bg-[#141824] border border-[#23293a] focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-sm font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isValidating || !voucherCodeInput.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-md shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Voucher</span>
                  </>
                )}
              </button>
            </form>

            {/* VALIDATION ERROR DISPLAY */}
            {validationError && (
              <div className="w-full bg-red-950/30 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-red-200 text-xs shadow-md">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-red-300">Voucher Lookup Failed</span>
                  <span>{validationError}</span>
                </div>
              </div>
            )}

            {/* VALIDATION SUCCESS & BILL ENTRY PANEL */}
            {validationResult && validationResult.voucher && (
              <div className="w-full bg-[#121520] border border-emerald-500/30 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-lg animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#1e2436]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Voucher Valid & Active
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    {validationResult.voucher.voucherCode}
                  </span>
                </div>

                {/* Offer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#141824] p-3 rounded-xl border border-[#23293a]">
                    <span className="text-[11px] text-zinc-500 block">Promotional Discount</span>
                    <span className="text-lg font-black text-emerald-400">
                      ₦{validationResult.voucher.discountNaira.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#141824] p-3 rounded-xl border border-[#23293a]">
                    <span className="text-[11px] text-zinc-500 block">Min. Bill Spend</span>
                    <span className="text-lg font-black text-white">
                      ₦{validationResult.voucher.minSpendNaira.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#141824] p-3 rounded-xl border border-[#23293a]">
                    <span className="text-[11px] text-zinc-500 block">Offer Title</span>
                    <span className="text-xs font-bold text-zinc-200 truncate block mt-1">
                      {validationResult.voucher.title || "Meal Discount"}
                    </span>
                  </div>
                </div>

                {/* Counter Bill Entry & 4-Digit Claim PIN Verification */}
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300 block">
                        Counter Bill Total (₦)
                      </label>
                      <input
                        type="number"
                        value={billAmountInput}
                        onChange={(e) => setBillAmountInput(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder={`Enter bill (min. ₦${validationResult.voucher.minSpendNaira})`}
                        className="w-full bg-[#141824] border border-[#23293a] focus:border-emerald-500 rounded-xl px-4 py-3 text-lg font-mono font-black text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-emerald-400" />
                          <span>4-Digit Customer Claim PIN</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Required
                        </span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d{4}"
                        maxLength={4}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={customerClaimPin}
                        onChange={(e) => setCustomerClaimPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="•••• (4-digit PIN)"
                        className="w-full bg-[#141824] border border-[#23293a] focus:border-emerald-500 rounded-xl px-4 py-3 text-lg font-mono font-black tracking-[0.25em] text-emerald-400 placeholder:text-zinc-600 placeholder:tracking-normal focus:outline-none"
                      />
                      <p className="text-[10px] text-zinc-500">
                        Ask customer for the 4-digit PIN displayed on their voucher ticket to confirm presence.
                      </p>
                    </div>
                  </div>

                  {billAmount > 0 && billAmount < minSpend && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        Bill total (₦{billAmount.toLocaleString()}) is below the required minimum spend of ₦{minSpend.toLocaleString()}.
                      </span>
                    </div>
                  )}

                  {/* Discount Computation Preview */}
                  {billAmount >= minSpend && (
                    <div className="bg-[#141824] border border-[#23293a] rounded-2xl p-4 flex flex-col gap-2.5 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>Original Bill Total</span>
                        <span className="font-bold text-white">₦{billAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Promotional Discount Applied</span>
                        <span className="font-black">-₦{actualDiscount.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-[#1c2233] flex justify-between items-center text-sm font-bold text-white">
                        <span>Customer Amount Due:</span>
                        <span className="text-2xl font-black text-emerald-400">
                          ₦{finalPayable.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleResetTerminal}
                      className="px-4 py-3 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-xs font-bold text-zinc-300"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      disabled={!canSettle}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs transition shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Settle (Due: ₦{finalPayable.toLocaleString()})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONFIRMATION MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#0e111a] border border-[#202738] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
                <h3 className="text-sm font-bold text-white">Confirm Counter Settlement</h3>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1 rounded text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#141824] border border-[#23293a] rounded-2xl p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Voucher Token</span>
                  <span className="font-mono font-bold text-white">
                    {validationResult?.voucher?.voucherCode}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Customer Claim PIN</span>
                  <span className="font-mono font-black tracking-widest text-emerald-400">
                    {customerClaimPin}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Merchant Branch</span>
                  <span className="font-semibold text-white">{cashierBranch}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Bill Total</span>
                  <span className="font-bold text-white">₦{billAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Promotional Discount</span>
                  <span className="font-black">-₦{actualDiscount.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-[#1c2233] flex justify-between items-center text-sm font-bold text-white">
                  <span>Customer Amount Due:</span>
                  <span className="text-xl font-black text-emerald-400">
                    ₦{finalPayable.toLocaleString()}
                  </span>
                </div>
              </div>

              {redemptionError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200">
                  {redemptionError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isRedeeming}
                  className="flex-1 py-3 rounded-xl bg-[#141824] hover:bg-[#1e2333] border border-[#23293a] text-xs font-bold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRedemption}
                  disabled={isRedeeming}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isRedeeming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Redemption</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}
