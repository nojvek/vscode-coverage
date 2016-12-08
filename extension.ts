// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as fs from 'fs'

interface CoverageMap {
    [path: string]: PathCoverageMap
}

interface PathCoverageMap {
    statementMap: {
        [id: string]: CoverageRange
    }
    fnMap: {
        [id: string]: {
            name: string,
            line: number,
            loc: CoverageRange
        }
    }
    branchMap: {
        [id: string]: {
            type: string
            line: number
            locations: CoverageRange[]
        }
    }
    s: {[id: string]: number}
    f: {[id: string]: number}
    b: {[id: string]: number[]}
}

interface CoverageDecorations {
    hit: vscode.DecorationOptions[]
    notHit: vscode.DecorationOptions[]
}

interface CoverageRange {
    start: CoveragePosition
    end: CoveragePosition
}

interface CoveragePosition {
    line: number,
    column: number
}

// TODO: Read from config
const coveragePath = "coverage_mapped.json"
let coverageMap: CoverageMap = {}

const hitBgColor = 'rgba(0,255,0,0.2)'
const notHitBgColor = 'rgba(255,0,0,0.2)'

// activate is the main method called when plugin is activated
export const activate = (context: vscode.ExtensionContext) => {
    console.log('decorator sample is activated');

    vscode.window.onDidChangeActiveTextEditor(editor => {
        updateDecorations(editor, coverageMap);
    }, null, context.subscriptions);

    setInterval(pollForUpdatedCoverageMap, 1000)
}

let lastCoverageMapPollTime = 0
const pollForUpdatedCoverageMap = () => {
    const pathStat = fs.statSync(coveragePath)
    const lastModified = pathStat.mtime.getTime()
    if (lastModified > lastCoverageMapPollTime) {
        lastCoverageMapPollTime = lastModified
        coverageMap = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'))
        updateDecorations(vscode.window.activeTextEditor, coverageMap);
    }
}

const updateDecorations = (activeEditor: vscode.TextEditor, coverageMap: CoverageMap) => {
    if (!activeEditor) {
        return;
    }

    const document = activeEditor.document;
    const filePath = document.fileName.toLowerCase();
    const lineCount = document.lineCount;

    if (!coverageMap[filePath]) {
        console.log(`${filePath} not in covMap`)
        return
    }

    console.log(`filePath: ${filePath}`)

    const coverageDecorations  = computeDecorations(coverageMap[filePath]);
    activeEditor.setDecorations(hitDecorator, coverageDecorations.hit);
    activeEditor.setDecorations(notHitDecorator, coverageDecorations.notHit);
}

const createColoredDecorator = (rgbaColor: string): vscode.TextEditorDecorationType => {
    return vscode.window.createTextEditorDecorationType({
        overviewRulerColor: rgbaColor,
        overviewRulerLane: vscode.OverviewRulerLane.Left,
        light: { // this color will be used in light color themes
            backgroundColor: rgbaColor
        },
        dark: { // this color will be used in dark color themes
            backgroundColor: rgbaColor
        }
    })
}

const hitDecorator = createColoredDecorator(hitBgColor)
const notHitDecorator = createColoredDecorator(notHitBgColor)

const computeDecorations = (pathCovMap: PathCoverageMap): CoverageDecorations => {
    const statementMap = pathCovMap.statementMap
    const fnMap = pathCovMap.fnMap
    const branchMap = pathCovMap.branchMap
    const decorations = {hit: [], notHit: []}

    for (let id of Object.keys(statementMap)) {
        const hitCount = pathCovMap.s[id]
        const pos = statementMap[id].start

        addDecoration(decorations, {line: pos.line, column: 0}, hitCount, 'statement hits')
    }

    for (let id of Object.keys(fnMap)) {
        const hitCount = pathCovMap.f[id]
        const pos = fnMap[id].loc.start

        addDecoration(decorations, pos, hitCount, `function: ${fnMap[id].name} hits`)
    }

    for (let id of Object.keys(branchMap)) {
        const hitCounts = pathCovMap.b[id]
        const branch = branchMap[id]
        const locations = branch.locations

        // if, else are the two branches
        if (branch.type === 'if') {
           addDecoration(decorations, locations[1].start, hitCounts[0], 'else branch hits')
        }
        // Switch can have many different branches
        else if (branch.type === 'switch') {
            for (let i = 0, len = hitCounts.length; i < len; ++i) {
                addDecoration(decorations, locations[i].start, hitCounts[i], `switch-case branch hits`)
            }
        }
    }

    return decorations
}

export const addDecoration = (decorations: CoverageDecorations, pos: CoveragePosition, hitCount: number, hoverMessage: string) => {
    const decoration = {
        range: new vscode.Range(pos.line - 1, pos.column, pos.line - 1, pos.column),
        hoverMessage,
        renderOptions: {
            before: {
                // Using unicode space characters since VSCode will swallow leading and trailing spaces
                // See: https://www.cs.tut.fi/~jkorpela/chars/spaces.html
                contentText:`\u2000${hitCount}\u2000`,
                backgroundColor: hitCount ? hitBgColor : notHitBgColor,
                color: "rgba(255,255,255,0.5)",
            }
        }
    }

    hitCount ? decorations.hit.push(decoration) : decorations.notHit.push(decoration)
}
