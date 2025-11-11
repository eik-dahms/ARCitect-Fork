import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import fs from 'fs'
import os from 'os';
import readline from 'readline';
import { spawn } from 'child_process';

function isArc(check_dir: string) {
    if (fs.statSync(check_dir).isDirectory()) {
        const isaFile = `${check_dir}/isa.investigation.xlsx`;
        return fs.existsSync(isaFile)}
    return false;
}

interface LocalArcType {
    location: string,
    name?: string
    local_last_update?: string,
    remote_last_update?: string,
}

interface LocalArcServiceType {
    directories: Set<string>,
    localArcs: Set<string>,
    selectAndAddArc: (e: Electron.IpcMainInvokeEvent, options?: Electron.OpenDialogOptions) => Promise<string[] | null>,
    selectAndAddDirectory: (e: Electron.IpcMainInvokeEvent, options?: Electron.OpenDialogOptions) => Promise<string[] | null>,
    addLocalArc: (e: Electron.IpcMainInvokeEvent, arc: string) => Promise<void>,
    addLocalArcs: (e: Electron.IpcMainInvokeEvent, arcs: string[]) => Promise<{success: boolean, message: string, arcs: string[]}>,
    removeLocalArc: (e: Electron.IpcMainInvokeEvent,location: string) => Promise<void>,
    addDirectory: (e: Electron.IpcMainInvokeEvent, directory: string) => Promise<void>,
    removeDirectory: (e: Electron.IpcMainInvokeEvent, directory: string) => Promise<void>,
    getUserArcs: (e: Electron.IpcMainInvokeEvent) => Promise<LocalArcType[]>,
    loadFromFile: () => void,
    saveToFile: () => void,
    scanFileSystemForArcs: (e: Electron.IpcMainInvokeEvent, fullScan?: boolean) => Promise<void>,
    init: () => Promise<void>,
}

const LocalARCsDataFile = app.getPath('userData')+'/localArcs.json';

type SearchInfo = {kind: 'info', data: any}
type ResultPath = {kind: 'path', data: string}
type SearchError = {kind: 'error', data: any}
type SearchYield = SearchInfo | ResultPath | SearchError;

async function* searchGitWindows(fullScan: boolean = false): AsyncGenerator<SearchYield> {
    
    // find all hard drives
    let drives: string[] = [];
    const command = "wmic";
    const filter = fullScan ? [] : ["Where \"DriveType = 3\""]; // 3 is for local hard drives
    const args = ["logicaldisk"].concat(filter, ["get", "name"]);
    yield {kind: 'info', data: `Searching for drives with command: ${command} ${args.join(' ')}`};
    
    // spawn the wmic command to gather drive information
    let child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'] });

    child.on('error', (err) => {
        console.error('Failed to start command:', err);
    });

    child.stdout.on('end', (data: Buffer | undefined): void => {
        console.log(`stdout: ${data}`);
        // extract the drives from the output
        
        if (data) {
            const output = data.toString();
            // split by new lines and filter out empty lines
            drives = output.split('\n').filter(line => line.trim() !== '' && line.trim() !== 'Name');
        }
    });

    for (const drive of drives) {
        
        // for each drive, find .git directories
        const findCommand = "cmd.exe";
        const findArgs = ["/c", "dir", "/s", "/b", `${drive.trim()}\\.git`];
        yield {kind: 'info', data: `Searching in drive: ${drive.trim()}\nCommand: ${findCommand} ${findArgs.join(' ')}`};

        // spawn the find command
        // using try-catch to handle errors in spawning the command
        try {
            var findChild = spawn(findCommand, findArgs, { stdio: ['ignore', 'pipe', 'inherit'] });
        } catch (error) {
            yield {kind: 'error', data: `Failed to start find command: ${error}`};
            continue;
        }

        // readline interface to read the output
        const readLine = readline.createInterface({
            input: findChild.stdout,
            crlfDelay: Infinity,
        });

        // yield lines from the output
        try {
            for await (const line of readLine) {
                yield {kind: 'path', data: line.trim()};
            }
        }
        catch (error) {
            yield {kind: 'error', data: `Error reading output: ${error}`};
        }
        finally {
            readLine.close();
            findChild.kill();
        }
    }
    // readline interface to read the output
}

async function* searchGitUnix(fullScan: boolean = false): AsyncGenerator<SearchYield> {
    const command = "find";
    const filter = fullScan ? [] : ["-xdev"]; // -xdev prevents crossing filesystem boundaries
    const args = ["/"].concat(filter, ["-name", ".git"]);
    
    yield {kind: 'info', data: `Searching for .git directories with command: ${command} ${args.join(' ')}`};

    // spawn the find command
    try {
        var child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    } catch (error) {
        yield {kind: 'error', data: `Failed to start find command: ${error}`};
        return;
    }
    // readline interface to read the output
    const readLine = readline.createInterface({
        input: child.stdout,
        crlfDelay: Infinity,
    });

    // yield lines from the output
    // this will be an async generator function
    try {
        for await (const line of readLine) {
            yield {kind: 'path', data: line.trim()};
    }}
    catch (error) {
        yield {kind: 'error', data: `Error reading output: ${error}`};
    }
    finally {
        readLine.close();
        child.kill();
    }
}

type searchDotGit = (fullScan?: boolean) => AsyncGenerator<SearchYield>;

type searchUpdate = {
    platform: string,
    infos: (SearchInfo | SearchError) []
    arcCandidates: number,
    arcFound: number,
    arcNew: number,
    new_arcs: string[]
}

const scan_dot_git: {
    win32: searchDotGit
    darwin: searchDotGit
    linux: searchDotGit
} = {
    win32: searchGitWindows,
    darwin: searchGitUnix,
    linux: searchGitUnix
}

class LocalArc implements LocalArcType {
    location: string;
    name?: string;
    local_last_update?: string;
    remote_last_update?: string;
    branch?: string;
    remote?: string;

    constructor(location: string) {
        this.location = location;
        this.name = location.split('/').pop();
        this.local_last_update = '';
        this.remote_last_update = '';   
    }

    isGitRepo() {
        const gitDir = `${this.location}/.git`;
        return fs.existsSync(gitDir);
    }

    readBranch() {
        const process = spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: this.location });
        let branch = '';
        process.stdout.on('data', (data) => {
            this.branch = data.toString().trim();
        })
        return branch;
    }

    readRemote() {
        const process = spawn('git', ['remote', '-v'], { cwd: this.location });
        let remote = '';
        process.stdout.on('data', (data) => {
            console.log(data)
            this.remote = data.toString().trim();
        })
        return remote;
    }

    toJSON(){
        return {
            location: this.location,
            name: this.name,
            local_last_update: this.local_last_update,
            remote_last_update: this.remote_last_update
        }
    }
}

export const LocalArcService: LocalArcServiceType = {
    directories: new Set([]),
    localArcs: new Set([]),
    
    selectAndAddArc: async (e, options: Electron.OpenDialogOptions = {}) => {
    // lets user select local arc/s and add them to the local arc tracker
        options.properties = ['openDirectory','multiSelections'] 
        const window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
        if (!window) {
            throw new Error('No active window found');
        }
        const result = await dialog.showOpenDialog(window, options);
        console.log('Selected files:', result.filePaths);
        if (result.canceled || result.filePaths.length === 0) {
            return {success: false, message: 'No arcs to add', arcs: result.filePaths};
        } else {
            for (const filePath of result.filePaths) {
                await LocalArcService.addLocalArc(e, filePath);
            }
            return {success: true, message: 'Arcs added successfully', arcs: result.filePaths};
        }  
    },

    selectAndAddDirectory: async (e, options: Electron.OpenDialogOptions = {}) => {
        // lets user select local arc/s and add them to the local arc tracker
        options.properties = ['openDirectory'] 
        const window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
        if (!window) {
            throw new Error('No active window found');
        }
        const result = await dialog.showOpenDialog(window, options);
        console.log('Selected directory:', result.filePaths);
        if (result.canceled || result.filePaths.length === 0) {
            return {sucess: false, message: 'No directory to add', arcs: result.filePaths};
        } else {
            const directory = result.filePaths[0];
            await LocalArcService.addDirectory(e, directory);
            console.log('Added directory:', directory);
        }
        return {success: true, message: 'Directory added successfully', arcs: result.filePaths};
        },
    
    


    addLocalArc: async (e, arc: string) => {
        if (!LocalArcService.localArcs.has(arc)) {
            LocalArcService.localArcs.add(arc);
            console.log(arc)
            LocalArcService.saveToFile();
        }
    },

    addLocalArcs: async (e, arcs: string[]) => {
        for (const arc of arcs) {
            if (!LocalArcService.localArcs.has(arc)) {
                LocalArcService.localArcs.add(arc);
                console.log(arc)
                
            }
            LocalArcService.saveToFile();
        }
        return {success: true, message: 'Arcs added successfully', arcs: arcs};
    },

    removeLocalArc: async (e, location: string) => {
        if (LocalArcService.localArcs.has(location)) {
            LocalArcService.localArcs.delete(location);
            LocalArcService.saveToFile();
        }
    },
    
    addDirectory: async (e, directory: string) => {
        if (!LocalArcService.directories.has(directory)) {
            LocalArcService.directories.add(directory);
            LocalArcService.saveToFile();
        }
    },
    
    removeDirectory: async (e, directory: string) => {
        if (LocalArcService.directories.has(directory)) {
            LocalArcService.directories.delete(directory);
            LocalArcService.saveToFile();
        }
    },
    
    getUserArcs: async (e) => {
        console.log('getUserArcs', LocalArcService.localArcs);
        let localArcsList: LocalArcType[] = [];
        for (const directory of LocalArcService.directories) {
            if (fs.existsSync(directory)) {
                const files = fs.readdirSync(directory);
                for (const file of files) {
                    const filePath = `${directory}/${file}`;
                    if (isArc(filePath)) {
                        localArcsList.push((new LocalArc(filePath)).toJSON());
                    }
                }}
            else {
                await LocalArcService.removeDirectory(e, directory);
            }
        }
        for (const arc of LocalArcService.localArcs) {
            if (fs.existsSync(arc)) {
                localArcsList.push((new LocalArc(arc)).toJSON());
            }
            else {
                await LocalArcService.removeLocalArc(e, arc);
            }
        }
    //return []
       return localArcsList;
    },
    
    getDirectories: async (e) => {
        return LocalArcService.directories;
    },
    
    getLocalArcStats: () => {

    },

    loadFromFile: () => {
        if (fs.existsSync(LocalARCsDataFile)) {
            let fileData = fs.readFileSync(LocalARCsDataFile, 'utf8');
            let parsedData = JSON.parse(fileData);
            LocalArcService.localArcs = new Set(parsedData.localArcs);
            LocalArcService.directories = new Set(parsedData.directories);
            console.log('LocalArcs loaded from file:', LocalArcService.localArcs);
        }
        else {
            console.log('LocalARCs data file does not exist.');
        }
    },

    saveToFile: () => {
        console.log('Saving LocalArcs to file:', LocalARCsDataFile, '<-');
        let data = {"directories": Array.from(LocalArcService.directories), "localArcs": Array.from(LocalArcService.localArcs)};
        fs.writeFileSync(LocalARCsDataFile, JSON.stringify(data, null, 2), 'utf8');
        console.log(JSON.stringify(LocalArcService.localArcs, null, 2))
        console.log('LocalArcs saved to file:', LocalArcService.localArcs);
    },

    scanFileSystemForArcs: async function (e, fullScan: boolean = false) {
            const searchUpdate: searchUpdate = {
                platform: os.platform(),
                infos: [],
                arcCandidates: 0,
                arcFound: 0,
                arcNew: 0,
                new_arcs: []
            };
            
            const currentUserArcs = await LocalArcService.getUserArcs(e);
            const platform = os.platform() as keyof typeof scan_dot_git;
        
            for await (let arcCandidate of scan_dot_git[platform](fullScan)) {
                // Process each gitCandidate here
                if (arcCandidate.kind === 'path') {
                    console.log('Found arc candidate:', arcCandidate.data);
                    searchUpdate.arcCandidates++;
                    // get search path parent directory
                    const dotGitDir = fs.statSync(arcCandidate.data)
                    const parentDir = fs.realpathSync(`${arcCandidate.data}/..`);
                    console.log('Parent directory:', parentDir);
                    console.log('dotGitDir:', dotGitDir);
                    if (dotGitDir.isDirectory() && isArc(parentDir)) {
                        searchUpdate.arcFound++;
                        console.log('FOUND ARC:', parentDir);
                        if (!LocalArcService.localArcs.has(parentDir)) {
                            searchUpdate.arcNew++;
                            searchUpdate.infos.push({kind: 'info', data: `Found new arc: ${parentDir}`});
                        }
                        searchUpdate.new_arcs.push(parentDir);
                        
                        e.sender.send('searchUpdate', {...searchUpdate});
                    }
                } else {
                    searchUpdate.infos.push(arcCandidate);
                    e.sender.send('searchUpdate', {...searchUpdate});
                }
            }
            e.sender.send('searchFinished', { ... searchUpdate });
        },

    init: async () => {
        LocalArcService.loadFromFile();
        ipcMain.handle('LocalArcService.addLocalArc', LocalArcService.addLocalArc);
        ipcMain.handle('LocalArcService.removeLocalArc', LocalArcService.removeLocalArc);
        ipcMain.handle('LocalArcService.getUserArcs', LocalArcService.getUserArcs);
        ipcMain.handle('LocalArcService.addDirectory', LocalArcService.addDirectory);
        ipcMain.handle('LocalArcService.removeDirectory', LocalArcService.removeDirectory);
        ipcMain.handle('LocalArcService.scanFileSystemForArcs', LocalArcService.scanFileSystemForArcs);
        ipcMain.handle('LocalArcService.selectAndAddArc', LocalArcService.selectAndAddArc);
        ipcMain.handle('LocalArcService.selectAndAddDirectory', LocalArcService.selectAndAddDirectory);
    }

}

export type {searchUpdate}


