import nodemailer from "nodemailer";

export async function post({ request }) {
    try {
        const body = await request.json();
        const { name, email, phone, service, message, "g-recaptcha-response": token } = body;

        // 1️⃣ Overenie reCAPTCHA v3
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`;
        const recaptchaRes = await fetch(verifyUrl, { method: "POST" });
        const recaptchaData = await recaptchaRes.json();

        if (!recaptchaData.success || recaptchaData.score < 0.5) {
            return new Response(JSON.stringify({ message: "reCAPTCHA verification failed" }), { status: 400 });
        }

        // 2️⃣ Validácia povinných polí
        if (!name || !email || !message) {
            return new Response(JSON.stringify({ message: "Missing required fields" }), { status: 400 });
        }

        // 3️⃣ Nodemailer transport
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_USER, // tvoj Gmail
                pass: process.env.MAIL_PASS, // App password
            },
        });

        // 4️⃣ Odoslanie e-mailu
        await transporter.sendMail({
            from: `"Web Kontakt" <${process.env.MAIL_USER}>`,
            to: process.env.MY_EMAIL, // kam sa majú odosielať správy
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

        return new Response(JSON.stringify({ message: "Email bol odoslaný ✅" }), { status: 200 });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
    }
}
