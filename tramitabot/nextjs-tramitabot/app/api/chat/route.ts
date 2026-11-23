import OpenAI from "openai"
import {OpenAIStream, StreamingTextResponse} from "ai"
import { DataAPIClient, vector } from "@datastax/astra-db-ts"
import { cloneElement } from "react"
import { OllamaEmbeddings } from "@langchain/ollama"
import { Groq } from 'groq-sdk';


const { 
    ASTRA_DB_KEYSPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GROQ_API_KEY
    } = process.env


   // const openai = new OpenAI({
     //   baseURL: "http://localhost:11434/v1",
  //apiKey: "ollama",
    //})


    const groq= new Groq({apiKey: GROQ_API_KEY})

    const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
    const db= client.db(ASTRA_DB_API_ENDPOINT, {keyspace: ASTRA_DB_KEYSPACE})

    export async function POST(req: Request){
            try{


                const { messages }= await req.json()
                const latestMessage= messages[messages.length -1]?.content

                let docContent= ""


            const embeddings = new OllamaEmbeddings({
            model: "nomic-embed-text",
            baseUrl: "http://localhost:11434",
                 })

                 const vector = await embeddings.embedQuery(latestMessage)


                try{
                    const collection= await db.collection(ASTRA_DB_COLLECTION)
                   
                    const cursor= collection.find(null,{
                        sort:{
                        $vector: vector,
                        },
                        limit: 10
                    })

                    const documents= await cursor.toArray()
                   
                    const docsMap=documents?.map(doc => doc.text || doc.content)

                    docContent = JSON.stringify(docsMap)

                }catch(err){
                    console.log("Error queryng db...")
                    docContent=""
            }

            const template ={
                role:"system",
                content:`Eres TramitaBot, un asistente virtual especializado en orientar sobre trámites administrativos de la Generalitat Valenciana.

REGLAS DE FORMATO (OBLIGATORIAS):
- Escribe siempre en texto plano, sin usar sintaxis Markdown: no uses asteriscos dobles (**), almohadillas (#), bloques de código ni enlaces con formato [texto](url).
- Si necesitas separar ideas o enumerar pasos, usa saltos de línea reales y guiones simples (-) o números seguidos de punto (1.), nunca pongas viñetas seguidas en la misma línea.
- Escribe URLs completas directamente solo si aparecen tal cual en el contexto proporcionado.
- Mantén las respuestas breves, claras y fáciles de leer en pantalla, con párrafos cortos.

REGLAS DE INFORMACIÓN Y ALCANCE:
- Responde únicamente con la información presente en el contexto proporcionado (documentos PDF y fuentes oficiales).
- No inventes ni supongas requisitos, documentación, plazos, tasas/importes, sedes ni procedimientos.
- Si el contexto no contiene la información necesaria o es insuficiente, indícalo con claridad y recomienda consultar la sede electrónica oficial de la Generalitat Valenciana.
- Tu función es únicamente orientar e informar; nunca realices trámites, solicitudes ni gestiones en nombre de la persona usuaria.

IDIOMA:
- Responde en español o valenciano adaptándote al idioma de la consulta del usuario y mantén ese mismo idioma de principio a fin.
    ------------------
    START CONTEXT
    ${docContent}
    END CONTEXT
    ------------------
    QUESTION: ${latestMessage}`
            }

          /*const response=  await openai.chat.completions.create({
                model:"qwen2.5-coder:7b",
                stream:true,
                messages:[template, ...messages]
            })*/

                const response= await groq.chat.completions.create({
                    model:"qwen/qwen3.8-27b",
                    stream:true,
                    messages: [template, ...messages]
                })

            const stream= OpenAIStream(response as any)
            return new StreamingTextResponse(stream)

            }catch(err){
                    throw err
            }
    }