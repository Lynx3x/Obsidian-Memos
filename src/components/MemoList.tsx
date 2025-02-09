import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import appContext from '../stores/appContext';
import { locationService, memoService, queryService } from '../services';
import { FIRST_TAG_REG, IMAGE_URL_REG, LINK_REG, MEMO_LINK_REG, NOP_FIRST_TAG_REG, TAG_REG } from '../helpers/consts';
import utils from '../helpers/utils';
import { checkShouldShowMemoWithFilters } from '../helpers/filter';
import Memo from './Memo';
import '../less/memolist.less';
import dailyNotesService from '../services/dailyNotesService';
import appStore from '../stores/appStore';
import { Notice, Platform } from 'obsidian';
import { HideDoneTasks } from '../memos';
import { t } from '../translations/helper';
import Pagination from './Pagination';

interface Props {}

export let copyShownMemos: Model.Memo[];

const ITEMS_PER_PAGE = 10; // 每页显示10条记录

const MemoList: React.FC<Props> = () => {
  const {
    locationState: { query },
    memoState: { memos },
  } = useContext(appContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [isFetching, setFetchStatus] = useState(true);
  const wrapperElement = useRef<HTMLDivElement>(null);
  
  const { tag: tagQuery, duration, type: memoContentType, text: textQuery, filter: queryId } = query;
  const queryFilter = queryService.getQueryById(queryId);
  const showMemoFilter = Boolean(
    tagQuery || (duration && duration.from < duration.to) || memoContentType || textQuery || queryFilter,
  );

  const shownMemos =
    showMemoFilter || queryFilter || HideDoneTasks
      ? memos.filter((memo) => {
          let shouldShow = true;

          if (memo.memoType !== undefined) {
            if (HideDoneTasks && memo.memoType === 'TASK-DONE') {
              shouldShow = false;
            }
          }

          if (memo.content.contains('comment:')) {
            shouldShow = false;
          }

          if (queryFilter) {
            const filters = JSON.parse(queryFilter.querystring) as Filter[];
            if (Array.isArray(filters)) {
              shouldShow = checkShouldShowMemoWithFilters(memo, filters);
            }
          }

          if (tagQuery) {
            const tagsSet = new Set<string>();
            for (const t of Array.from(memo.content.match(TAG_REG) ?? [])) {
              const tag = t.replace(TAG_REG, '$1').trim();
              const items = tag.split('/');
              let temp = '';
              for (const i of items) {
                temp += i;
                tagsSet.add(temp);
                temp += '/';
              }
            }
            for (const t of Array.from(memo.content.match(NOP_FIRST_TAG_REG) ?? [])) {
              const tag = t.replace(NOP_FIRST_TAG_REG, '$1').trim();
              const items = tag.split('/');
              let temp = '';
              for (const i of items) {
                temp += i;
                tagsSet.add(temp);
                temp += '/';
              }
            }
            for (const t of Array.from(memo.content.match(FIRST_TAG_REG) ?? [])) {
              const tag = t.replace(FIRST_TAG_REG, '$2').trim();
              const items = tag.split('/');
              let temp = '';
              for (const i of items) {
                temp += i;
                tagsSet.add(temp);
                temp += '/';
              }
            }
            if (!tagsSet.has(tagQuery)) {
              shouldShow = false;
            }
          }
          if (
            duration &&
            duration.from < duration.to &&
            (utils.getTimeStampByDate(memo.createdAt) < duration.from ||
              utils.getTimeStampByDate(memo.createdAt) > duration.to)
          ) {
            shouldShow = false;
          }
          if (memoContentType) {
            if (
              memoContentType === 'NOT_TAGGED' &&
              (memo.content.match(TAG_REG) !== null || memo.content.match(NOP_FIRST_TAG_REG) !== null)
            ) {
              shouldShow = false;
            } else if (memoContentType === 'LINKED' && memo.content.match(LINK_REG) === null) {
              shouldShow = false;
            } else if (memoContentType === 'IMAGED' && memo.content.match(IMAGE_URL_REG) === null) {
              shouldShow = false;
            } else if (memoContentType === 'CONNECTED' && memo.content.match(MEMO_LINK_REG) === null) {
              shouldShow = false;
            }
          }
          if (textQuery && !memo.content.includes(textQuery)) {
            shouldShow = false;
          }

          return shouldShow;
        })
      : memos.filter((memo) => {
          return !memo.content.contains('comment:');
        });

  copyShownMemos = shownMemos;

  // 分页计算
  const totalPages = Math.ceil(shownMemos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMemos = shownMemos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    wrapperElement.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setCurrentPage(1); // 重置页码
  }, [query, memos.length]);

  useEffect(() => {
    setTimeout(() => {
      memoService
        .fetchAllMemos()
        .then(() => {
          setFetchStatus(false);
        })
        .catch(() => {
          new Notice(t('Fetch Error'));
        });
    }, 400);
    dailyNotesService
      .getMyAllDailyNotes()
      .then(() => {
        setFetchStatus(false);
      })
      .catch(() => {
        new Notice('😭 Fetch DailyNotes Error');
      });
    dailyNotesService.getState();
    memoService.getState();
  }, []);

  useEffect(() => {
    wrapperElement.current?.scrollTo({ top: 0 });
  }, [query]);

  const handleMemoListClick = useCallback((event: React.MouseEvent) => {
    const { workspace } = appStore.getState().dailyNotesState.app;

    const targetEl = event.target as HTMLElement;
    if (targetEl.tagName === 'SPAN' && targetEl.className === 'tag-span') {
      const tagName = targetEl.innerText.slice(1);
      const currTagQuery = locationService.getState().query.tag;
      if (currTagQuery === tagName) {
        locationService.setTagQuery('');
      } else {
        locationService.setTagQuery(tagName);
      }
    } else if (targetEl.tagName === 'A' && targetEl.className === 'internal-link') {
      const sourcePath = targetEl.getAttribute('data-filepath') || '';
      if (sourcePath) {  // 只有在路径存在时才打开链接
        if (Platform.isMobile) {
          workspace.openLinkText(sourcePath, sourcePath, false);
        } else {
          workspace.openLinkText(sourcePath, sourcePath, true);
        }
      }
    }
  }, []);

  return (
    <div
      className={`memolist-wrapper ${isFetching ? '' : 'completed'}`}
      onClick={handleMemoListClick}
      ref={wrapperElement}
    >
      {paginatedMemos.map((memo) => (
        <Memo key={`${memo.id}-${memo.updatedAt}`} memo={memo} />
      ))}
      <div className="status-text-container">
        <p className="status-text">
          {isFetching
            ? t('Fetching data...')
            : shownMemos.length === 0
            ? t('Noooop!')
            : showMemoFilter
            ? ''
            : t('All Data is Loaded 🎉')}
        </p>
      </div>
      {!isFetching && shownMemos.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default MemoList;
