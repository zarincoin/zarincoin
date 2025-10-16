// Minimal diagnostic: talk to Ledger ETH app and get an address.
// Comments in English only.

const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const AppEth = require("@ledgerhq/hw-app-eth").default;

const HD_PATH = process.env.LEDGER_PATH || "44'/60'/0'/0/0";

(async () => {
  let transport;
  try {
    transport = await TransportNodeHid.create();
    const eth = new AppEth(transport);

    // Try depArb.js style first (display=false, chainCode=true)
    try {
      const res = await eth.getAddress(HD_PATH, false, true);
      console.log("[diag] getAddress(display=false, chainCode=true) →", res);
    } catch (e1) {
      console.warn("[diag] chainCode=true rejected:", e1.message || e1);
      // Fallback to plain (no chainCode)
      const res2 = await eth.getAddress(HD_PATH);
      console.log("[diag] getAddress() →", res2);
    }
  } catch (e) {
    console.error("[diag] Failed to talk to Ledger:", e);
    process.exit(1);
  } finally {
    if (transport && transport.close) { try { await transport.close(); } catch {} }
  }
})();

