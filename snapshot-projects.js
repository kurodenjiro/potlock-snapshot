
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
        process.env.POTLOCK_PROJECT_SUPABASE_URL,
        process.env.POTLOCK_PROJECT_SUPABASE_ANON_KEY
    );
    
    const vectorStoreProject = new SupabaseVectorStore(embeddings, {
        client: supabaseClient,
        tableName: "documents",
        queryName: "match_documents",
    });
    
    const provider = new providers.JsonRpcProvider({ url: "https://rpc.mainnet.near.org" });
    const accountList = await provider.query({
        request_type: "call_function",
        account_id: "registry.potlock.near",
        method_name: "get_projects",
        args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
        finality: "optimistic",
    })
    const projectObject = (JSON.parse(Buffer.from(accountList.result).toString()));
    const data = await Object.values(projectObject).map(async (project, index) => {
        if (project.status === "Approved") {
            const projectDetail = await provider.query({
                request_type: "call_function",
                account_id: "social.near",
                method_name: "get",
                args_base64: (Buffer.from(JSON.stringify({ "keys": [`${project.id}/profile/**`] }))).toString("base64"),
                finality: "optimistic",
            })
            const dataProjectJson = (JSON.parse(Buffer.from(projectDetail.result).toString()));
            const data = Object.keys(dataProjectJson).map((key) => {
                const data = Object.values(dataProjectJson).map((item) => {
                    const data = {
                        index: index,
                        accountId: project.id == key && key,
                        projectId: project.id == key && key,
                        category: item.profile.category?.text ? [item.profile.category.text] : item.profile.category ? [item.profile.category] : JSON.parse(item.profile.plCategories),
                        backgroundImage: item.profile?.backgroundImage ? `https://ipfs.near.social/ipfs/${item.profile.backgroundImage.ipfs_cid}` : '',
                        image: item.profile?.image ? `https://ipfs.near.social/ipfs/${item.profile.image.ipfs_cid}` : '',
                        name: item.profile?.name,
                        description: item.profile?.description,
                        tagline: item.profile?.tagline,
                        socialUrl: item.profile?.linktree,
                        website: item.profile?.website,
                        tags: Object.keys(item.profile?.tags || []),
                        url: `https://app.potlock.org/?tab=project&projectId=${project.id}`
                    }
                    return data;
                })
                return data[0];
            })
            return data[0];
        }
        // projectList.push(data)
    });
    const projects = await Promise.all(data);
    const documentsProject = [];
    for (const projectDetail of projects) {
        const pageContent = JSON.stringify(projectDetail);
        if (projectDetail && projectDetail.accountId) {
            const metadata = {
                source: `https://app.potlock.org/?tab=project&projectId=${projectDetail.accountId}`,
                name: projectDetail.name,
                accountId: projectDetail.accountId,
            };
            documentsProject.push(new Document({ pageContent, metadata }));
        }
    }
    
    vectorStoreProject.addDocuments(documentsProje
}
run()
