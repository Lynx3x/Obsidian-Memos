import { moment, TFile } from 'obsidian';
import { getDailyNote } from 'obsidian-daily-notes-interface';
// import appStore from "../stores/appStore";
import dailyNotesService from '../services/dailyNotesService';
import appStore from '../stores/appStore';

function convertDailyNotes(notes: Record<string, any>): Record<string, any> {
  return notes;
}

export async function changeMemo(
  memoid: string,
  originalContent: string,
  content: string,
  memoType?: string,
  path?: string,
): Promise<Model.Memo> {
  const { dailyNotes } = dailyNotesService.getState();
  const { vault, metadataCache } = appStore.getState().dailyNotesState.app;
  const timeString = memoid.slice(0, 14);
  const idString = parseInt(memoid.slice(14));
  let changeDate: moment.Moment;
  if (/^\d{14}/g.test(content)) {
    changeDate = moment(content.slice(0, 14), 'YYYYMMDDHHmmss');
  } else {
    changeDate = moment(timeString, 'YYYYMMDDHHmmss');
  }

  let file: TFile;
  if (path !== undefined) {
    file = metadataCache.getFirstLinkpathDest('', path) as unknown as TFile;
  } else {
    const notes = convertDailyNotes(dailyNotes);
    const dailyNote = getDailyNote(changeDate, notes);
    file = dailyNote as unknown as TFile;
  }
  if (!file) {
    throw new Error('File not found');
  }
  const fileContent = await vault.read(file);
  const fileLines = getAllLinesFromFile(fileContent);
  const removeEnter = content.replace(/\n/g, '<br>').replace(/(<br>)(<br>)/g, '$1 $2');
  const originalLine = fileLines[idString];
  const newLine = fileLines[idString].replace(originalContent, removeEnter);
  const newFileContent = fileContent.replace(originalLine, newLine);
  await vault.modify(file, newFileContent);
  return {
    id: memoid,
    content: removeEnter,
    user_id: 1,
    deletedAt: '',
    createdAt: changeDate.format('YYYY/MM/DD HH:mm:ss'),
    updatedAt: changeDate.format('YYYY/MM/DD HH:mm:ss'),
    memoType: memoType || 'JOURNAL',
    hasId: memoid.slice(-6),
    linkId: '',
    path: file.path,
  };
}

export function getFile(memoid: string): TFile {
  const { dailyNotes } = dailyNotesService.getState();
  const timeString = memoid.slice(0, 14);
  const changeDate = moment(timeString, 'YYYYMMDDHHmmss');
  const notes = convertDailyNotes(dailyNotes);
  const dailyNote = getDailyNote(changeDate, notes);
  return dailyNote as unknown as TFile;
}

const getAllLinesFromFile = (cache: string) => cache.split(/\r?\n/);
