import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { OllamaEmbeddings } from "@langchain/ollama"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import OpenAI from "openai"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import "dotenv/config"
import path from "path"

type SimilarityMethod = "dot_product" | "cosine" | "euclidean"

const {
    ASTRA_DB_KEYSPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN
} = process.env

//const openai = new OpenAI({
//    apiKey: OPENAI_API_KEY,
//})

const tramitabotData = [
    // LABORA (toda la Comunitat)
    "https://labora.gva.es/es/ciutadania/busque-ocupacio/com-inscriuret/inscrpicio",
    "https://labora.gva.es/es/ciutadania/busque-ocupacio/com-inscriuret/primera-inscripcio",
    "https://labora.gva.es/es/consultas-frecuentes/inscripcio",
    "https://labora.gva.es/es/ciutadania/busque-ocupacio/obligacions-dels-demandants-d-ocupacio",
    "https://labora.gva.es/es/autoservef",
    "https://labora.gva.es/es/ciutadania/busque-ocupacio/ofertes-labora/com-inscriures",
    "https://labora.gva.es/es/sol-licitud-de-cita-previa-per-a-atencio-personalitzada",
    // Becas (toda la Comunitat)
    "https://www.gva.es/es/inicio/procedimientos?id_proc=G95885",
    "https://universitats.gva.es/es/-/05-%C2%BFqu%C3%A9-requisitos-generales-se-deben-cumplir-para-ser-persona-beneficiaria-1",
    "https://universitats.gva.es/es/manuela-solis/convocatoria",
    "https://universitats.gva.es/es/finalitzacio-estudis/convocatoria",
    "https://www.gva.es/es/inicio/procedimientos?id_proc=E242",
    // Becas no universitarias (Bachillerato, FP, etc.)
    "https://www.gva.es/es/inicio/procedimientos?id_proc=E242",
    "https://sede.gva.es/es/detall-tramit?id_proc=E242",

    // Empadronamiento / relacionados
    "https://registrocivil.gva.es/es/vecindad-civil",
    "https://sede.gva.es/es/detall-tramit?id_proc=21561",
    "https://sede.gva.es/es/como-identificarse",
    "https://sede.valencia.es/sede/registro/procedimiento/pa.ce.10?lang=1",
    "https://vanguard-student-housing.com/es/empadronamiento-valencia-requisitos.html",
    // Obligaciones y servicios
    "https://labora.gva.es/es/ciutadania/busque-ocupacio/obligacions-dels-demandants-d-ocupacio",
    "https://labora.gva.es/es/autoservef",   // Qué es Punt LABORA
    "https://labora.gva.es/es/ciutadania/busque-ocupacio/ofertes-labora/com-inscriures", // Cómo inscribirse a ofertas
    "https://labora.gva.es/es/sol-licitud-de-cita-previa-per-a-atencio-personalitzada",

    // Formación y ayudas
    "https://labora.gva.es/es/ciutadania/busque-formacio/general",
    "https://labora.gva.es/va/ajudes-de-formacio/2026/-/asset_publisher/q6fDgmifQct4/content/becas-y-ayudas-para-las-personas-trabajadoras-desempleadas-que-participen-en-acciones-formativas-de-labo-1"
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_KEYSPACE })

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
})



const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434"
});

const createCollection = async (similarityMetric: SimilarityMethod = "dot_product") => {
    try {
        const res = await db.createCollection(ASTRA_DB_COLLECTION!, {
            vector: {
                dimension: 768,
                metric: similarityMetric
            }
        })
        console.log("Colección creada:", res)
    } catch (e: any) {

        if (e.name === 'CollectionAlreadyExistsError') {
            console.log("La colección ya existe, continuando...")
        } else {
            throw e
        }
    }
}
//======funcion para cargar PDFs=============
const loadPdf = async (filePath: string) => {
    const loader = new PDFLoader(filePath as any)
    const docs = await loader.load()
    return docs.map(doc => doc.pageContent).join("\n")
}
//===================================


const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION)

    //============scraping paginas web================
    for await (const url of tramitabotData) {
        console.log(`Procesando URL: ${url}`)

        try {
            const content = await scrapePage(url)
            if (!content) continue


            const chunks = await splitter.splitText(content)

            for await (const chunk of chunks) {
                if (chunk.trim().length < 50) continue


                const vector = await embeddings.embedQuery(chunk)

                const res = await collection.insertOne({
                    $vector: vector,
                    text: chunk,
                    source: url
                })
                console.log("Insertando chunk:", res)
            }

            await new Promise(resolve => setTimeout(resolve, 2000))

        } catch (err: any) {
            console.error(`Error al procesar la URL ${url}:`, err.message)
            console.log("Continuando con la siguiente URL...")
        }
    }

    // ========== 2. PDFs ==========
    const pdfFiles = [
        path.resolve("./docs/guia1.pdf"),
        path.resolve("./docs/guia2.pdf"),
        path.resolve("./docs/guia3.pdf"),
        path.resolve("./docs/guia4.pdf"),
        path.resolve("./docs/guia5.pdf"),
        path.resolve("./docs/guia6.pdf"),
        path.resolve("./docs/guia7.pdf"),
        path.resolve("./docs/guia8.pdf")
    ]

    for (const pdfPath of pdfFiles) {
        console.log(`Procesando PDF: ${pdfPath}`)

        try {
            const content = await loadPdf(pdfPath)
            if (!content) continue

            const chunks = await splitter.splitText(content)

            for (const chunk of chunks) {
                if (chunk.trim().length < 50) continue

                const vector = await embeddings.embedQuery(chunk)

                await collection.insertOne({
                    $vector: vector,
                    text: chunk,
                    source: pdfPath
                })
                console.log("Insertando chunk PDF")
            }
        } catch (err: any) {
            console.error(`Error con el PDF ${pdfPath}:`, err.message)
        }
    }
}



const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        },
        gotoOptions: {
            waitUntil: "networkidle2",
            timeout: 60000
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerText)
            await browser.close()
            return result
        }
    })

    const content = await loader.scrape()
    return content?.replace(/\s+/g, " ").trim() || ""
}


createCollection().then(() => loadSampleData().then(() => {
    console.log("Carga de datos completada.")
    process.exit(0)
}))


