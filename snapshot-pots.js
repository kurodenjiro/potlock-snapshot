
import { providers } from 'near-api-js'
import { OpenAIEmbeddings } from '@langchain/openai'
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { Document } from "@langchain/core/documents";
import { } from 'dotenv/config'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function run() {
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        apiKey: OPENAI_API_KEY
    });
    
    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabaseClient,
        tableName: "pots",
        queryName: "match_documents",
    });
    
     const provider = new providers.JsonRpcProvider({ url: "https://rpc.mainnet.near.org" });
    
    const potList = await provider.query({
        request_type: "call_function",
        account_id: "v1.potfactory.potlock.near",
        method_name: "get_pots",
        args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
        finality: "optimistic",
    })
    const potObject = (JSON.parse(Buffer.from(potList.result).toString()));
    const dataPot = await Object.values(potObject).map(async (pot) => {
        const potInfo = await provider.query({
            request_type: "call_function",
            account_id: pot.id,
            method_name: "get_config",
            args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
            finality: "optimistic",
        })
        const potInfoData = JSON.parse(Buffer.from(potInfo.result).toString())
        const projectList = await provider.query({
            request_type: "call_function",
            account_id: pot.id,
            method_name: "get_approved_applications",
            args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
            finality: "optimistic",
        })
        const isRoundLive = await provider.query({
            request_type: "call_function",
            account_id: pot.id,
            method_name: "is_round_active",
            args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
            finality: "optimistic",
        })
        const dataProjectJson = (JSON.parse(Buffer.from(projectList.result).toString()));
    
        const data = {
            id: pot.id,
            name: potInfoData.pot_name,
            description: potInfoData.pot_description,
            project: dataProjectJson.map((item) => item.project_id),
            isRoundLive: JSON.parse(Buffer.from(isRoundLive.result).toString())
        }
        return data;
    
    });
    const pots = await Promise.all(dataPot);
    const documentsPots = [];
    for (const potDetail of pots) {
        const pageContent = JSON.stringify(potDetail);
        if (potDetail && potDetail.id) {
            const metadata = {
                source: `https://app.potlock.org/?tab=pot&potId=${potDetail.id}`,
            };
            new Document({ pageContent, metadata })
            documentsPots.push(new Document({ pageContent, metadata }));
        }
    }
    vectorStore.addDocuments(documentsPots)
}
run()
