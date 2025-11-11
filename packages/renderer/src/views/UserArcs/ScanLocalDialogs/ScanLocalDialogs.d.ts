// redefine fix import / type sharing
type SearchInfo = {kind: 'info', data: any}
type SearchError = {kind: 'error', data: any}
type searchUpdate = {
    platform: string,
    infos: (SearchInfo | SearchError) []
    arcCandidates: number,
    arcFound: number,
    arcNew: number,
    new_arcs: string[]
}
