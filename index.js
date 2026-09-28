require("dotenv").config();

const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const apiKey = process.env.OPENROUTER_API_KEY;

console.log("OpenRouter API anahtarı bulundu mu:", !!apiKey);
console.log(
    "OpenRouter API anahtarı uzunluğu:",
    apiKey ? apiKey.length : 0
);

/*
 * ==========================================
 * COMMANDO AI - UYGUNSUZLUK FİLTRESİ
 * ==========================================
 */

const yasakliKelimeler = [
    "amk",
    "aq",
    "amina koy",
    "amina koyay",
    "amina koyim",
    "amina koyayim",
    "amina koyayım",

    "ananı",
    "anani",
    "anan",
    "anneni",
    "annen",

    "orospu",
    "orosp",
    "piç",
    "pic",
    "pezevenk",

    "siktir",
    "yarrak",
    "göt",
    "got",

    "ibne",
    "kahpe",
    "sürtük",
    "surtuk",

    "sikik",
    "sikeyim",
    "sikiyim",
    "sikim",
    "sikerim",

    "fahişe",
    "fahise",

    "şerefsiz",
    "serefsiz",
    "şerefsizlik",
    "serefsizlik",

    "gerizekalı",
    "gerizekali",
    "salak",
    "aptal"
];

function normalizeText(text) {
    return String(text)
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[@4]/g, "a")
        .replace(/[3]/g, "e")
        .replace(/[1!]/g, "i")
        .replace(/[0]/g, "o")
        .replace(/[5$]/g, "s")
        .replace(/[7]/g, "t")
        .replace(/\s+/g, " ")
        .trim();
}

function compactText(text) {
    return normalizeText(text)
        .replace(/[^a-z0-9]/g, "");
}

function uygunsuzIcerikVarMi(message) {
    const normal = normalizeText(message);
    const compact = compactText(message);

    for (const kelime of yasakliKelimeler) {
        const temizKelime = normalizeText(kelime);
        const kompaktKelime = compactText(kelime);

        const kelimeSiniri = new RegExp(
            `(^|[^a-z0-9])${temizKelime.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            )}([^a-z0-9]|$)`,
            "i"
        );

        if (kelimeSiniri.test(normal)) {
            return true;
        }

        if (
            kompaktKelime.length >= 4 &&
            compact.includes(kompaktKelime)
        ) {
            return true;
        }
    }

    return false;
}


// ==========================================
// CHAT
// ==========================================

app.post("/chat", async (req, res) => {
    try {
        const message = req.body.message;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                error: "Mesaj boş olamaz."
            });
        }

        // Uygunsuz içerik kontrolü
        if (uygunsuzIcerikVarMi(message)) {
            return res.json({
                blocked: true,
                reply:
                    "Bu mesajda uygunsuz veya hakaret içeren ifadeler bulunduğu için cevap veremiyorum."
            });
        }

        // OpenRouter API anahtarı kontrolü
        if (!apiKey) {
            console.error("OPENROUTER_API_KEY bulunamadı.");

            return res.status(500).json({
                error: "OpenRouter API anahtarı bulunamadı."
            });
        }

        // OpenRouter isteği
        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://commando-ai.onrender.com",
                    "X-Title": "Commando AI"
                },

                body: JSON.stringify({
                    model: "openrouter/free",

                    messages: [
                        {
                            role: "system",
                            content: `
Sen Commando AI'sın.

Kullanıcılarla Türkçe konuş.

Sorulara mümkün olduğunca doğru, açık ve faydalı cevaplar ver.

Bilmediğin bir şeyi uydurma.
Emin değilsen bunu açıkça belirt.

Kullanıcı isterse konuyu örneklerle ve adım adım açıkla.

Küfür, hakaret veya uygunsuz ifadelerle karşılık verme.

Uygunsuz veya cinsel içerikli taleplerde güvenli ve uygun
bir şekilde cevap ver.

Senin adın Commando AI.
`
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        console.log("OpenRouter HTTP durumu:", response.status);
        console.log("OpenRouter cevabı:", data);

        if (!response.ok) {
            return res.status(500).json({
                error: "OpenRouter AI hatası.",
                details:
                    data?.error?.message ||
                    "Bilinmeyen OpenRouter hatası."
            });
        }

        const reply =
            data?.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(500).json({
                error: "OpenRouter cevap döndürmedi."
            });
        }

        res.json({
            blocked: false,
            reply: reply
        });

    } catch (error) {
        console.error("SUNUCU / OPENROUTER HATASI:", error);

        res.status(500).json({
            error: "AI cevap verirken bir hata oluştu.",
            details: error.message
        });
    }
});


// ==========================================
// SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `Commando AI çalışıyor: http://localhost:${PORT}`
    );
});