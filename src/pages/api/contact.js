import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const body = await req.json();
        const { name, email, phone, service, message, recaptcha } = body;

        const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
        const params = new URLSearchParams();
        params.append("secret", process.env.RECAPTCHA_SECRET_KEY);
        params.append("response", recaptcha);

        const recRes = await fetch(verifyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });
        const recData = await recRes.json();

        if (!recData.success || recData.score < 0.5) {
            return res.status(400).json({ message: "Captcha verification failed" });
        }

        if (!name || !email || !message) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Nodemailer cez Gmail
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        await transporter.sendMail({
            from: `"Web Kontakt" <${process.env.MAIL_USER}>`,
            to: process.env.MY_EMAIL,
            subject: `Nová správa z webu: ${service || "nezadaná služba"}`,
            text: `
Meno: ${name}
Email: ${email}
Telefón: ${phone || "-"}
Služba: ${service || "-"}
Správa:
${message}
`
        });

        return res.status(200).json({ message: "Email odoslaný ✅" });
    } catch (err) {
        console.error("Contact API error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
