require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
const client = new OpenAI();

app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
    try {
        const message = req.body.message;

        if (!message) {
            return res.status(400).json({
                error: "Mesaj boş olamaz."
            });
        }

        const cevap = await client.responses.create({
            model: "gpt-5.6-luna",
            input: message
        });

        res.json({
            reply: cevap.output_text
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "AI cevap verirken bir hata oluştu."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Commando AI çalışıyor: http://localhost:${PORT}`);
});