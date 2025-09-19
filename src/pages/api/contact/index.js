export const prerender = false;
import nodemailer from "nodemailer";

export async function POST({ request }) {
    try {
        const body = await request.json();
        const { name, email, phone, service, message, recaptcha } = body;

        // Overenie reCAPTCHA
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
            return new Response(
                JSON.stringify({ message: "Captcha verification failed" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!name || !email || !message) {
            return new Response(
                JSON.stringify({ message: "Missing required fields" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Nodemailer cez Gmail
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
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
`,
        });

        return new Response(
            JSON.stringify({ message: "Email odoslaný ✅" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Contact API error:", err);
        return new Response(
            JSON.stringify({ message: "Server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
