const access_token = localStorage.getItem("strateegia_api_token");
console.log(localStorage);



let cData = {
    "nodes": [],
    "links": []
};

let fData = {};

let counter = [
    { "id": "users", "title": "usuários", "quant": 0, "color": "#636c77" },
    { "id": "active_users", "title": "usuários ativos", "quant": 0, "color": "#636c77" },
    { "id": "inactive_users", "title": "usuários inativos", "quant": 0, "color": "#636c77" },
    { "id": "comments", "title": "respostas", "quant": 0, "color": "#e51d1d" },
    { "id": "replies", "title": "comentários", "quant": 0, "color": "#377eb8" },
    { "id": "agreements", "title": "concordar", "quant": 0, "color": "#4eaf49" },
    { "id": "kits", "title": "ferramentas", "quant": 0, "color": "#ff8000" },
    { "id": "questions", "title": "questões", "quant": 0, "color": "#974da2" },
];

let filters = {};

function addNode(id, title, group, created_at, dashboard_url) {
    let date = new Date(created_at)
    //let parseTime = d3.timeFormat("%Y-%m-%dT%H:%M:%S.%L");
    //let parsedDate = parseTime(date);
    cData["nodes"].push({
        "id": id,
        "title": title,
        "group": group,
        "created_at": date,
        "dashboard_url": dashboard_url
    });
}

function addLink(source, target) {
    let target_node = cData["nodes"].find(x => x.id === target)
    if (target_node != undefined) {
        target_node.parent_id = source;
    }
    cData["links"].push({
        "source": source,
        "target": target
    });
}

function drawProject(projectId, s_mode) {

    const ADD_USERS = true;

    cData = {
        "nodes": [],
        "links": []
    }

    fData = {
        "nodes": [],
        "links": []
    }

    selected_mode = s_mode;

    if (selected_mode === "usuário") {
        filters = {
            group: group => ["comment", "reply", "agreement", "users", "user"].includes(group),
            // group: group => ["project", "map", "kit", "question", "comment", "reply", "agreement", "users", "user"].includes(group),
        };
    } else if (selected_mode === "projeto") {
        filters = {
            // group: group => ["comment", "reply", "agreement", "users", "user"].includes(group),
            group: group => ["project", "map", "kit", "question", "comment", "reply", "agreement"].includes(group),
        };
    } else if (selected_mode === "indicadores") {
        filters = {
            group: group => ["project", "map", "kit", "question", "comment", "reply", "agreement", "users", "user"].includes(group),
        };
    }

    getProjectById(access_token, projectId).then(project => {
        console.log("getProjectById()")
        console.log(project);
        const dashboard_url = `https://app.strateegia.digital/dashboard/project/${projectId}`;
        if (project.missions.length > 1) {
            addNode(projectId, project.title, "project", project.created_at, dashboard_url);
        }
        if (ADD_USERS) {
            addNode("users", "Usuários", "users", project.created_at);
            for (let index = 0; index < project.users.length; index++) {
                const user = project.users[index];
                addNode(user.id, user.name, "user", project.created_at);
                addLink("users", user.id);
            }
        }
        for (let a = 0; a < project.missions.length; a++) {
            const currentMission = project.missions[a];
            const missionId = project.missions[a].id;
            getMapById(access_token, missionId).then(map_response => {
                console.log("getMapById()");
                console.log(map_response);
                const missionId = map_response.id;
                const missionTitle = map_response.title;
                const missionCreatedAt = map_response.created_at;
                const projectId = map_response.project_id;
                const dashboard_url = `https://app.strateegia.digital/dashboard/project/${projectId}/mission/${missionId}`;
                addNode(missionId, missionTitle, "map", missionCreatedAt, dashboard_url);
                if (project.missions.length > 1) {
                    addLink(projectId, missionId);
                }
            });
            // console.log(missionId + " -> " + missionTitle);
            getAllContentsByMissionId(access_token, missionId).then(response => {
                console.log("getAllContentsByMissionId()")
                console.log(response);
                let arrayContents = response.content;
                for (let i = 0; i < arrayContents.length; i++) {
                    const missionId = arrayContents[i].mission_id;
                    const contentId = arrayContents[i].id;
                    const contentCreatedAt = arrayContents[i].created_at;
                    const kitId = arrayContents[i].kit.id;
                    const kitTitle = arrayContents[i].kit.title;
                    const kitCreatedAt = arrayContents[i].kit.created_at;
                    const dashboard_url = `https://app.strateegia.digital/dashboard/project/${projectId}/mission/${missionId}/content/${contentId}`
                    addNode(contentId, kitTitle, "kit", contentCreatedAt, dashboard_url);
                    addLink(missionId, contentId);
                    const arrayQuestions = arrayContents[i].kit.questions;
                    for (let j = 0; j < arrayQuestions.length; j++) {
                        const questionId = arrayQuestions[j].id;
                        const questionId_graph = `${questionId}.${contentId}`;
                        const questionText = arrayQuestions[j].question;
                        const questionCreatedAt = arrayQuestions[j].created_at;
                        addNode(questionId_graph, questionText, "question", contentCreatedAt, dashboard_url);
                        addLink(contentId, questionId_graph);
                    }

                    getCommentsGroupedByQuestionReport(access_token, contentId).then(question_report => {
                        const dashboard_url = `https://app.strateegia.digital/dashboard/project/${projectId}/mission/${missionId}/content/${contentId}`
                        console.log("getCommentsGroupedByQuestionReport()");
                        console.log(question_report);
                        for (let k = 0; k < question_report.length; k++) {
                            const questionId = question_report[k].id;
                            const questionId_graph = `${questionId}.${contentId}`;
                            const arrayComments = question_report[k].comments;
                            for (let w = 0; w < arrayComments.length; w++) {
                                const comment = arrayComments[w];
                                const commentId = comment.id;
                                const commentText = comment.text;
                                const commentCreatedAt = comment.created_at;
                                const commentCreatedBy = comment.created_by;
                                addNode(commentId, commentText, "comment", commentCreatedAt, dashboard_url);
                                if (selected_mode === "usuário" || selected_mode === "indicadores") {
                                    addLink(commentCreatedBy, commentId);
                                } else if (selected_mode === "projeto") {
                                    addLink(questionId_graph, commentId);
                                }
                                const replies = comment.replies;
                                for (let reply_index = 0; reply_index < replies.length; reply_index++) {
                                    const reply = replies[reply_index];
                                    const replyId = reply.id;
                                    const replyText = reply.text;
                                    const replyCreatedAt = reply.created_at;
                                    const replyCreatedBy = reply.created_by;
                                    addNode(replyId, replyText, "reply", replyCreatedAt, dashboard_url);
                                    if (selected_mode === "usuário" || selected_mode === "indicadores")  {
                                        addLink(replyCreatedBy, replyId);
                                    } else if (selected_mode === "projeto") {
                                        addLink(commentId, replyId);
                                    }
                                    for (let reply_agreement_index = 0; reply_agreement_index < reply.agreements.length; reply_agreement_index++) {
                                        const reply_agreement = reply.agreements[reply_agreement_index];
                                        const reply_agreement_id = `${reply_agreement_index}.${replyId}`;
                                        const reply_agreement_created_at = reply_agreement.created_at;
                                        const reply_agreement_created_by = reply_agreement.user_id;
                                        addNode(reply_agreement_id, "OK", "agreement", reply_agreement_created_at, dashboard_url);
                                        if (selected_mode === "usuário" || selected_mode === "indicadores")  {
                                            addLink(reply_agreement_created_by, reply_agreement_id);
                                        } else if (selected_mode === "projeto") {
                                            addLink(replyId, reply_agreement_id);
                                        }
                                    }
                                }
                                const agreements = comment.agreements;
                                for (let agree_index = 0; agree_index < agreements.length; agree_index++) {
                                    const agreement = agreements[agree_index];
                                    const agreementId = `${agree_index}.${commentId}`
                                    const agreementCreatedBy = agreement.user_id;
                                    addNode(agreementId, "OK", "agreement", agreement.created_at, dashboard_url);
                                    if (selected_mode === "usuário" || selected_mode === "indicadores")  {
                                        addLink(agreementCreatedBy, agreementId);
                                    } else if (selected_mode === "projeto") {
                                        addLink(commentId, agreementId);
                                    }
                                }
                            }
                        }
                    })
                        .then(d => {
                            if (selected_mode !== "indicadores") {
                                initializeGraph();
                            } else {
                                const filteredData = applyFilters(cData);
                                fData = filteredData;
                                countStatistics(fData);
                            }
                        })
                        ;
                }
            });
        }
    });
}

function initializeProjectList() {
    getAllProjects(access_token).then(labs => {
        console.log("getAllProjects()");
        console.log(labs);
        // Initial project
        let listProjects = [];
        for (let i = 0; i < labs.length; i++) {
            let currentLab = labs[i];
            if (currentLab.lab.name == null) {
                currentLab.lab.name = "Personal";
            }
            for (let j = 0; j < currentLab.projects.length; j++) {
                const project = currentLab.projects[j];
                console.log(`${currentLab.lab.name} -> ${project.title}`);
                listProjects.push({
                    "id": project.id,
                    "title": project.title,
                    "lab_id": currentLab.lab.id,
                    "lab_title": currentLab.lab.name
                });
            }
        }
        let options = d3.select("#projects-list")
            .on("change", () => {
                let selected_project = d3.select("#projects-list").property('value');
                let selected_mode = d3.select("#modes-list").property('value');
                drawProject(selected_project, selected_mode);
            })
            .selectAll("option")
            .data(listProjects, d => d.id);

        options.enter()
            .append("option")
            .attr("value", (d) => { return d.id })
            .text((d) => { return `${d.lab_title} -> ${d.title}` });

        let modes = ["indicadores", "projeto", "usuário"];
        d3.select("#modes-list")
            .on("change", () => {
                let selected_project = d3.select("#projects-list").property('value');
                let selected_mode = d3.select("#modes-list").property('value');
                drawProject(selected_project, selected_mode);
            })
            .selectAll("option")
            .data(modes)
            .enter()
            .append("option")
            .attr("value", (d) => { return d })
            .text((d) => { return d });
        drawProject(labs[0].projects[0].id, "indicadores");
    });
}


/* 
    =============================
    Functions for manipulating the graph
    =============================
 */

function commonUpdate() {
    const filteredData = applyFilters(cData);
    fData = filteredData;
    countStatistics(fData);
    buildGraph(filteredData.nodes, filteredData.links);
    return filteredData;
}

function initializeGraph() {
    const filteredData = commonUpdate();
    initializeSimulation(filteredData.nodes, filteredData.links);
    updateAll(filteredData.links);
}

function updateGraph() {
    const filteredData = commonUpdate();
    updateAll(filteredData.links);
}

/* 
    =============================
    Functions for filtering data for graph
    =============================
 */

/**
 * Filters an array of objects using custom predicates.
 *
 * @param  {Array}  array: the array to filter
 * @param  {Object} filters: an object with the filter criteria
 * @return {Array}
 * REFERENCE: https://gist.github.com/jherax/f11d669ba286f21b7a2dcff69621eb72
 */
function filterArray(array, filters) {
    const filterKeys = Object.keys(filters);
    return array.filter(item => {
        // validates all filter criteria
        return filterKeys.every(key => {
            // ignores non-function predicates
            if (typeof filters[key] !== 'function') return true;
            return filters[key](item[key]);
        });
    });
}

function applyFilters(inputData) {
    let filteredData = {
        "nodes": [],
        "links": []
    };
    filteredData.nodes = filterArray(inputData.nodes, filters);
    let nodeIDs = [];
    for (let index = 0; index < filteredData.nodes.length; index++) {
        const element = filteredData.nodes[index].id;
        nodeIDs.push(element);
    }
    // console.log(node_ids);
    filteredData.links = inputData.links.filter(d => {
        // console.log(d);
        return (nodeIDs.includes(d.source) && nodeIDs.includes(d.target)) ||
            (nodeIDs.includes(d.source.id) && nodeIDs.includes(d.target.id));
    });
    fData = filteredData;
    return filteredData;
}

function filterByTime(inputDate) {
    let parseTime = d3.timeFormat("%d/%m/%Y - %H:%M:%S");

    let timeScale = d3.scaleTime().domain([0, 50])
        .range([d3.min(cData.nodes, d => d.created_at), d3.max(cData.nodes, d => d.created_at)]);
    let dateLimit = timeScale(inputDate);

    // const nodesContains = (link, nodes) => {
    //     let source = link.source.id;
    //     let target = link.target.id;
    //     for (let index = 0; index < nodes.length; index++) {
    //         const node_id = nodes[index].id;
    //         if (node_id == target) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    // fData.nodes = fData.nodes.filter((d) => { return d.created_at <= dateLimit });
    // fData.links = fData.links.filter((d) => { return nodesContains(d, fData.nodes) });

    filters.created_at = created_at => created_at <= dateLimit;
    d3.select("#choose_date").text(parseTime(dateLimit))

    updateGraph();
}

/* 
    =============================
    Counter
    =============================
 */

function countStatistics(input_data) {
    counter.forEach(function (d, i) {
        d.quant = 0;
    });
    for (let i = 0; i < input_data.nodes.length; i++) {
        const e = input_data.nodes[i];
        if (e.group === "user") {
            const c = counter.find(x => x.id === "users");
            c.quant = c.quant + 1;
            // Check if user has links in input_data.links
            let user_links = input_data.links.filter(d => {
                return d.source === e.id;
            });
            if (user_links.length > 0) {
                const c = counter.find(x => x.id === "active_users");
                c.quant = c.quant + 1;
            } else {
                const c = counter.find(x => x.id === "inactive_users");
                c.quant = c.quant + 1;
            }
        } else if (e.group === "comment") {
            const c = counter.find(x => x.id === "comments");
            c.quant = c.quant + 1;
        } else if (e.group === "reply") {
            const c = counter.find(x => x.id === "replies");
            c.quant = c.quant + 1;
        } else if (e.group === "agreement") {
            const c = counter.find(x => x.id === "agreements");
            c.quant = c.quant + 1;
        } else if (e.group === "kit") {
            const c = counter.find(x => x.id === "kits");
            c.quant = c.quant + 1;
        } else if (e.group === "question") {
            const c = counter.find(x => x.id === "questions");
            c.quant = c.quant + 1;
        }
    }

    let filter = {};

    if (selected_mode === "projeto") {
        filter = {
            id: id => ["comments", "replies", "agreements", "kits", "questions"].includes(id),
        };
    } else if (selected_mode === "usuário") {
        filter = {
            id: id => ["comments", "replies", "agreements", "users"].includes(id),
        };
    } else if (selected_mode === "indicadores") {
        filter = {
            id: id => ["comments", "replies", "agreements", "users", "questions", "active_users", "inactive_users"].includes(id),
        };
    }

    let data = filterArray(counter, filter);

    if (selected_mode === "usuário" || selected_mode === "projeto") {
        d3.select("#indicators").style("display", "none");
        d3.select("#stat_list").style("display", "block");
        d3.select("#graph_view").style("display", "block");
        let ul_ = d3.select("#stat_list")
            .selectAll("li")
            .data(data, d => d.id);
        ul_
            .enter()
            .append("li");
        ul_
            .style("color", d => d.color)
            .text(d => `${d.title} ${d.quant}`);
        ul_
            .exit()
            .remove();
    } else if (selected_mode === "indicadores") {
        // Make sure the list is visible
        d3.select("#indicators").style("display", "block");
        d3.select("#stat_list").style("display", "none");
        d3.select("#graph_view").style("display", "none");
        
        
        let usuarios = data.find(d => d.id === "users").quant;
        let usuarios_ativos = data.find(d => d.id === "active_users").quant;
        let usuarios_inativos = data.find(d => d.id === "inactive_users").quant;
        let indice_atividade = (usuarios_ativos / usuarios) * 100;
        
        let questoes_num = data.find(d => d.id === "questions").quant;
        let respostas_num = data.find(d => d.id === "comments").quant;
        let comentarios_num = data.find(d => d.id === "replies").quant;
        let concordar_num = data.find(d => d.id === "agreements").quant;
        let interacoes_num = comentarios_num + concordar_num;

        let respostas_potenciais = usuarios_ativos * questoes_num;
        let interacoes_potenciais = usuarios_ativos * respostas_num;
        let engajamento_questoes = (respostas_num / respostas_potenciais) * 100;
        let engajamento_interacoes = (interacoes_num / interacoes_potenciais) * 100;

        let engajamento_media = (engajamento_questoes + engajamento_interacoes) / 2;
        engajamento_questoes = engajamento_questoes.toFixed(2);
        engajamento_interacoes = engajamento_interacoes.toFixed(2);
        d3.select("#pessoas_num").text(usuarios);
        d3.select("#pessoas_inativas_num").text(usuarios_inativos);
        d3.select("#indice_atividade_num").text(indice_atividade.toFixed(2)+"%");
        d3.select("#questoes_num").text(questoes_num);
        d3.select("#respostas_num").text(respostas_num);
        d3.select("#respostas_potenciais_num").text(respostas_potenciais);
        d3.select("#engajamento_questoes_num").text(engajamento_questoes+"%");
        d3.select("#comentarios_num").text(comentarios_num);
        d3.select("#concordar_num").text(concordar_num);
        d3.select("#interacoes_num").text(interacoes_num);
        d3.select("#interacoes_potenciais_num").text(interacoes_potenciais);
        d3.select("#engajamento_interacoes_num").text(engajamento_interacoes+"%");
        d3.select("#engajamento_media_num").text(engajamento_media.toFixed(2)+"%");
    }

}


/* 
    =============================
    Execute!
    =============================
 */

initializeProjectList();
