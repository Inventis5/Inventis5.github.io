import OpenAI from "openai"
import {OpenAIStream, StreamingTextResponse} from "ai"
import { DataAPIClient, vector } from "@datastax/astra-db-ts"
import { cloneElement } from "react"
import { OllamaEmbeddings } from "@langchain/ollama"



const { 
    ASTRA_DB_KEYSPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY
    } = process.env


    const openai = new OpenAI({
        baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
    })

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
                content:`Eres TramitaBot, un asistente virtual especializado en trámites administrativos de la Generalitat Valenciana.
    Utiliza el contexto proporcionado, procedente de documentos PDF y fuentes oficiales, para responder a las consultas de los ciudadanos.
    Responde de forma clara, sencilla y concisa, utilizando únicamente la información disponible en el contexto.
    Si la información necesaria no aparece en el contexto, indícalo y recomienda consultar la sede electrónica oficial de la Generalitat Valenciana.
    No inventes requisitos, documentos, plazos, importes ni procedimientos.
    Tu función es orientar e informar sobre los trámites administrativos, no realizar solicitudes ni gestionar procedimientos en nombre del usuario.
    Responde en español o valenciano según el idioma utilizado por el usuario.
    Utiliza Markdown cuando sea necesario y evita respuestas demasiado largas.
    ------------------
    START CONTEXT
    ${docContent}
    END CONTEXT
    ------------------
    QUESTION: ${latestMessage}`
            }

          const response=  await openai.chat.completions.create({
                model:"qwen2.5-coder:7b",
                stream:true,
                messages:[template, ...messages]
            })

            const stream= OpenAIStream(response as any)
            return new StreamingTextResponse(stream)

            }catch(err){
                    throw err
            }
    }