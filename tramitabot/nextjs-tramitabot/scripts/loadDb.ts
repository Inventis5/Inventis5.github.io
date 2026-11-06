import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { OllamaEmbeddings } from "@langchain/ollama"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import OpenAI from "openai"


import "dotenv/config"

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

const tramitabotData=[
    'https://ceice.gva.es', 
    'https://ceice.gva.es/es/web/becas-alumnat', 
    'https://www.telematricula.es', 
    'https://habitatge.gva.es', 
    'https://habitatge.gva.es/es/web/vivienda-i-arquitectura-bioclimatica/ajudes', 
    'https://labora.gva.es', 'https://labora.gva.es/es/ciutadania',
     'https://labora.gva.es/es/cita-previa',
      'https://www.sepe.es', 
      'https://inclusio.gva.es',
       'https://inclusio.gva.es/es/web/servicios-sociales',
        'https://www.gva.es/es/inicio/procedimientos?id_proc=18535',
         'https://san.gva.es',
          'https://san.gva.es/es/web/portal-del-paciente',
           'https://www.gva.es/es/inicio/procedimientos?id_proc=2751',
            'https://sede.gva.es', 
            'https://sede.gva.es/es/como-identificarse', 
            'https://www.accv.es'
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT,{keyspace:ASTRA_DB_KEYSPACE})

const splitter= new RecursiveCharacterTextSplitter({
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

const loadSampleData= async () => {
    const collection= await db.collection(ASTRA_DB_COLLECTION)
    
    for await (const url of tramitabotData){
        console.log(`Procesando URL: ${url}`)
        try{
        const content = await scrapePage(url)
        if (!content) continue
        
        
        const chunks= await splitter.splitText(content)

        for await (const chunk of chunks){
       
            const vector= await embeddings.embedQuery(chunk)

            const res = await collection.insertOne({
                $vector:vector,
                text: chunk
            })
            console.log("Insertando chunk:",res)
        }
    }catch (err: any){
        console.error(`Error al procesar la URL ${url}:`, err.message)
        console.log("Continuando con la siguiente URL...")
    }
    }
}


const scrapePage= async (url:string) => {
    const loader = new PuppeteerWebBaseLoader(url,{
        launchOptions:{
            headless:true
        },
        gotoOptions:{
            waitUntil:"domcontentloaded"
        },
        evaluate: async (page,browser)=>{
            const result= await page.evaluate(()=> document.body.innerHTML)
            await browser.close()
            return result
        }
    })
    return (await loader.scrape())?.replace(/<[^>]*>?/gm, '')
}


createCollection().then(()=> loadSampleData().then(()=>{
    console.log("Carga de datos completada.")
    process.exit(0)
}))