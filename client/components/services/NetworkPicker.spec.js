import { describe, expect, it } from "vitest";
import { detectNetworkFromPhone } from "./NetworkPicker";

describe("detectNetworkFromPhone", () => {
  it("detects MTN prefixes including +234 international format", () => {
    expect(detectNetworkFromPhone("08031234567")).toBe("MTN");
    expect(detectNetworkFromPhone("08136259221")).toBe("MTN");
    expect(detectNetworkFromPhone("09061234567")).toBe("MTN");
    expect(detectNetworkFromPhone("+2348031234567")).toBe("MTN");
    expect(detectNetworkFromPhone("07025123456")).toBe("MTN");
  });

  it("detects GLO prefixes", () => {
    expect(detectNetworkFromPhone("08051234567")).toBe("GLO");
    expect(detectNetworkFromPhone("08151234567")).toBe("GLO");
    expect(detectNetworkFromPhone("09051234567")).toBe("GLO");
  });

  it("detects AIRTEL prefixes", () => {
    expect(detectNetworkFromPhone("08021234567")).toBe("AIRTEL");
    expect(detectNetworkFromPhone("08121234567")).toBe("AIRTEL");
    expect(detectNetworkFromPhone("09021234567")).toBe("AIRTEL");
  });

  it("detects 9MOBILE prefixes", () => {
    expect(detectNetworkFromPhone("08091234567")).toBe("9MOBILE");
    expect(detectNetworkFromPhone("08181234567")).toBe("9MOBILE");
    expect(detectNetworkFromPhone("09091234567")).toBe("9MOBILE");
  });

  it("returns null for short or unknown prefixes", () => {
    expect(detectNetworkFromPhone("080")).toBeNull();
    expect(detectNetworkFromPhone("09991234567")).toBeNull();
    expect(detectNetworkFromPhone("")).toBeNull();
  });
});
