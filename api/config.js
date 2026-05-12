export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({
    amapKey: process.env.AMAP_KEY || process.env.AMAP_JS_KEY || "",
    securityJsCode: process.env.AMAP_SECURITY_KEY || "",
  });
}
