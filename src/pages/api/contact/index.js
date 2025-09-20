export const prerender = false;
import nodemailer from "nodemailer";

export async function POST({ request }) {
    try {
        const body = await request.json();
        const { name, email, phone, service, message, recaptcha } = body;

        // --- Overenie reCAPTCHA ---
        const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
        const params = new URLSearchParams();
        params.append("secret", process.env.RECAPTCHA_SECRET_KEY);
        params.append("response", recaptcha);

        const recRes = await fetch(verifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        const recData = await recRes.json();
        if (!recData.success || recData.score < 0.5) {
            return new Response(
                JSON.stringify({ message: "Overenie reCAPTCHA zlyhalo. Skúste znova." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // --- Validácia povinných polí ---
        if (!name || !email || !message) {
            return new Response(
                JSON.stringify({ message: "Prosím, vyplňte všetky povinné polia." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // --- Dĺžkové limity ---
        if (name.length < 3 || name.length > 100) {
            return new Response(
                JSON.stringify({ message: "Meno musí mať 3–100 znakov." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (email.length > 150) {
            return new Response(
                JSON.stringify({ message: "Email je príliš dlhý (max. 150 znakov)." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (message.length < 10 || message.length > 2000) {
            return new Response(
                JSON.stringify({ message: "Správa musí mať 10–2000 znakov." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // --- Formát telefónu ---
        if (phone && !/^09[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$/.test(phone)) {
            return new Response(
                JSON.stringify({ message: "Telefónne číslo musí byť v tvare 09xx xxx xxx." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // --- Odoslanie mailu cez Nodemailer ---
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
            JSON.stringify({ message: "Správa bola úspešne odoslaná ✅" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Contact API error:", err);
        return new Response(
            JSON.stringify({ message: "Nastala chyba na serveri. Skúste neskôr." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
