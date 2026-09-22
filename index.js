require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
const client = new OpenAI();

app.use(express.json());
app.use(express.static("public"));

// Küfür filtresi
const yasakliKelimeler = [
    "amk",
    "aq",
    "amina koyim",
    "orospu",
    "orospu çocuğu",
    "sik",
    "siktir",
    "yarrak",
    "piç",
    "ibne",
    "göt",
    "pezevenk"
];

app.post("/chat", async (req, res) => {
    try {
        const message = req.body.message;

        if (!message || !message.trim()) {
            return res.status(400).json({
                error: "Mesaj boş olamaz."
            });
        }

        // Küfür kontrolü
        const temizMesaj = message.toLocaleLowerCase("tr-TR");

        const kufurVar = yasakliKelimeler.some(kelime =>
            temizMesaj.includes(kelime)
        );

        if (kufurVar) {
            return res.json({
                reply: "Bu mesajda uygunsuz/küfürlü ifadeler bulunduğu için cevap veremiyorum."
            });
        }

        // AI cevabı
        const cevap = await client.responses.create({
            model: "gpt-5.6-luna",

            instructions: `
Sen Commando AI'sın.

Kullanıcılarla Türkçe konuş.
Sorulara mümkün olduğunca doğru, açık ve faydalı cevaplar ver.
Kullanıcının sorusunu anlamaya çalış ve doğrudan cevap ver.
Bilmediğin bir şeyi uydurma; emin değilsen bunu açıkça belirt.
Gereksiz yere kısa cevap verme.
Kullanıcı isterse konuyu örneklerle ve adım adım açıkla.
Küfürlü veya hakaret içeren bir kullanıcı mesajına karşılık küfür kullanma.
Tehlikeli veya uygun olmayan konularda güvenli şekilde cevap ver.
Senin adın Commando AI.
`,

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