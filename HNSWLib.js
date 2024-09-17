
import { providers } from 'near-api-js'
import { Document } from "@langchain/core/documents";
import { } from 'dotenv/config'
import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: OPENAI_API_KEY
});


async function run() {
     const vectorStore = await HNSWLib.fromDocuments([], embeddings);

    const provider = new providers.JsonRpcProvider({ url: "https://rpc.mainnet.near.org" });
    const accountList = await provider.query({
        request_type: "call_function",
        account_id: "registry.potlock.near",
        method_name: "get_projects",
        args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
        finality: "optimistic",
    })
    // const projectObject = (JSON.parse(Buffer.from(accountList.result).toString()));
    // const data = await Object.values(projectObject).map(async (project, index) => {
    //     if (project.status === "Approved") {
    //         const projectDetail = await provider.query({
    //             request_type: "call_function",
    //             account_id: "social.near",
    //             method_name: "get",
    //             args_base64: (Buffer.from(JSON.stringify({ "keys": [`${project.id}/profile/**`] }))).toString("base64"),
    //             finality: "optimistic",
    //         })
    //         const dataProjectJson = (JSON.parse(Buffer.from(projectDetail.result).toString()));
    //         const data = Object.keys(dataProjectJson).map((key) => {
    //             const data = Object.values(dataProjectJson).map((item) => {
    //                 const data = {
    //                     index: index,
    //                     accountId: project.id == key && key,
    //                     projectId: project.id == key && key,
    //                     category: item.profile.category?.text ? [item.profile.category.text] : item.profile.category ? [item.profile.category] : JSON.parse(item.profile.plCategories),
    //                     backgroundImage: item.profile?.backgroundImage ? `https://ipfs.near.social/ipfs/${item.profile.backgroundImage.ipfs_cid}` : '',
    //                     image: item.profile?.image ? `https://ipfs.near.social/ipfs/${item.profile.image.ipfs_cid}` : '',
    //                     name: item.profile?.name,
    //                     description: item.profile?.description,
    //                     tagline: item.profile?.tagline,
    //                     socialUrl: item.profile?.linktree,
    //                     website: item.profile?.website,
    //                     tags: Object.keys(item.profile?.tags || []),
    //                     url: `https://app.potlock.org/?tab=project&projectId=${project.id}`
    //                 }
    //                 return data;
    //             })
    //             return data[0];
    //         })
    //         return data[0];
    //     }
    //     // projectList.push(data)
    // });
    // const projects = await Promise.all(data);
    // const documentsProject = [];
    // for (const projectDetail of projects) {
    //     const pageContent = JSON.stringify(projectDetail);
    //     if (projectDetail && projectDetail.accountId) {
    //         const metadata = {
    //             source: `https://app.potlock.org/?tab=project&projectId=${projectDetail.accountId}`,
    //             type: 'potlock-project'
    //         };
    //         documentsProject.push(new Document({ pageContent, metadata }));
    //     }
    // }
    // console.log(documentsProject);
    // await vectorStore.addDocuments(documentsProject)
    // await vectorStore.save('./projects')
    // pots
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
            potId: pot.id,
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

        if (potDetail && potDetail.potId) {
            const metadata = {
                source: `https://app.potlock.org/?tab=pot&potId=${potDetail.id}`,
                type: 'potlock-pot'
            };
            new Document({ pageContent, metadata })
            documentsPots.push(new Document({ pageContent, metadata }));
        }
    }
    await vectorStore.addDocuments(documentsPots)
    await vectorStore.save('pots')
}
run()
