require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
const client = new OpenAI();

app.use(express.json());
app.use(express.static("public"));

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

/*
 * Türkçe karakterleri ve bazı yazım
 * değişikliklerini normalize eder.
 */
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

/*
 * Boşluk, nokta, tire vb. kaldırılır.
 * Örneğin:
 * "s i k t i r"
 * "s.i.k.t.i.r"
 * gibi yazımların yakalanmasına yardımcı olur.
 */
function compactText(text) {
    return normalizeText(text)
        .replace(/[^a-z0-9]/g, "");
}

/*
 * Uygunsuz içerik kontrolü
 */
function uygunsuzIcerikVarMi(message) {
    const normal = normalizeText(message);
    const compact = compactText(message);

    for (const kelime of yasakliKelimeler) {
        const temizKelime = normalizeText(kelime);
        const kompaktKelime = compactText(kelime);

        /*
         * Kelime normal şekilde yazılmışsa.
         */
        const kelimeSiniri = new RegExp(
            `(^|[^a-z0-9])${temizKelime.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
            "i"
        );

        if (kelimeSiniri.test(normal)) {
            return true;
        }

        /*
         * Boşluk/sembol eklenerek yazılmışsa.
         */
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

        /*
         * ÖNEMLİ:
         * Filtre API'ye gitmeden önce çalışıyor.
         */
        if (uygunsuzIcerikVarMi(message)) {
            return res.json({
                blocked: true,
                reply: "Bu mesajda uygunsuz veya hakaret içeren ifadeler bulunduğu için cevap veremiyorum."
            });
        }

        /*
         * AI
         */
        const cevap = await client.responses.create({
            model: "gpt-5.6-luna",

            instructions: `
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
`,

            input: message
        });

        res.json({
            blocked: false,
            reply: cevap.output_text
        });

    } catch (error) {
        console.error("AI HATASI:", error);

        res.status(500).json({
            error: "AI cevap verirken bir hata oluştu."
        });
    }
});


// ==========================================
// SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Commando AI çalışıyor: http://localhost:${PORT}`);
});