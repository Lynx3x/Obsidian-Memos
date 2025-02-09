import api from '../helpers/api';
import { FIRST_TAG_REG, NOP_FIRST_TAG_REG, TAG_REG } from '../helpers/consts';
import { waitForInsert } from '../obComponents/obCreateMemo';
import { changeMemo } from '../obComponents/obUpdateMemo';
import { commentMemo } from '../obComponents/obCommentMemo';
import appStore from '../stores/appStore';
import { State as MemoStoreState } from '../stores/memoStore';
import type { CreateCommentMemoParams, UpdateMemoParams } from '../types/memo';

/**
 * 备忘录服务类 - 处理所有与备忘录相关的操作
 */
class MemoService {
    /** 初始化状态标志 */
    private initialized = false;

    /**
     * 获取当前备忘录状态
     */
    public getState(): MemoStoreState {
        return appStore.getState().memoState;
    }

    /**
     * 获取所有备忘录
     * 从API获取备忘录数据并更新到store
     */
    public async fetchAllMemos(): Promise<Model.Memo[]> {
        const data = await api.getMyMemos();

        // 分离普通备忘录和评论备忘录
        const memos = data.memos || [];
        const commentMemos = data.commentMemos || [];

        // 更新store中的备忘录数据
        this.updateMemoStore(memos, commentMemos);

        if (!this.initialized) {
            this.initialized = true;
        }

        return memos;
    }

    /**
     * 获取已删除的备忘录列表
     */
    public async fetchDeletedMemos(): Promise<Model.Memo[]> {
        const deletedMemos = await api.getMyDeletedMemos();
        return deletedMemos.sort((a, b) =>
            new Date(b.deletedAt || '').getTime() - new Date(a.deletedAt || '').getTime()
        );
    }

    /**
     * 向store中添加新的备忘录
     */
    public pushMemo(memo: Model.Memo): void {
        appStore.dispatch({
            type: 'INSERT_MEMO',
            payload: { memo: { ...memo } }
        });
    }

    /**
     * 向store中添加新的评论备忘录
     */
    public pushCommentMemo(memo: Model.Memo): void {
        appStore.dispatch({
            type: 'INSERT_COMMENT_MEMO',
            payload: { memo: { ...memo } }
        });
    }

    /**
     * 根据ID查找备忘录
     */
    public getMemoById(id: string): Model.Memo | null {
        return this.getState().memos.find((m: Model.Memo) => m.id === id) || null;
    }

    /**
     * 根据ID查找评论备忘录
     */
    public getCommentMemoById(id: string): Model.Memo | null {
        return this.getState().commentMemos.find((m: Model.Memo) => m.id === id) || null;
    }

    /**
     * 隐藏（软删除）指定备忘录
     */
    public async hideMemoById(id: string): Promise<void> {
        await api.hideMemo(id);
        appStore.dispatch({
            type: 'DELETE_MEMO_BY_ID',
            payload: { id }
        });
    }

    /**
     * 恢复已删除的备忘录
     */
    public async restoreMemoById(id: string): Promise<void> {
        await api.restoreMemo(id);
    }

    /**
     * 永久删除备忘录
     */
    public async deleteMemoById(id: string): Promise<void> {
        await api.deleteMemo(id);
    }

    /**
     * 编辑备忘录内容
     */
    public editMemo(memo: Model.Memo): void {
        appStore.dispatch({
            type: 'EDIT_MEMO',
            payload: memo
        });
    }

    /**
     * 编辑评论备忘录内容
     */
    public editCommentMemo(memo: Model.Memo): void {
        appStore.dispatch({
            type: 'EDIT_COMMENT_MEMO',
            payload: memo
        });
    }

    /**
     * 更新标签状态
     * 解析所有备忘录中的标签并更新到store
     */
    public updateTagsState(): void {
        const { memos } = this.getState();
        const uniqueTags = new Set<string>();
        const tagCounts: { [key: string]: number; } = {};

        // 遍历所有备忘录收集标签
        memos.forEach((memo: Model.Memo) => {
            const tags = this.extractTagsFromContent(memo.content);
            tags.forEach(tag => {
                uniqueTags.add(tag);
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        // 更新store中的标签数据
        appStore.dispatch({
            type: 'SET_TAGS',
            payload: {
                tags: Array.from(uniqueTags),
                tagsNum: tagCounts
            }
        });
    }

    /**
     * 清空store中的备忘录数据
     */
    public clearMemos(): void {
        appStore.dispatch({
            type: 'SET_MEMOS',
            payload: { memos: [] }
        });
    }

    /**
     * 获取链接到指定备忘录的所有备忘录
     */
    public async getLinkedMemos(memoId: string): Promise<Model.Memo[]> {
        return this.getState().memos.filter((m: Model.Memo) => m.content.includes(memoId));
    }

    /**
     * 获取指定备忘录的所有评论
     */
    public async getCommentMemos(memoId: string): Promise<Model.Memo[]> {
        return this.getState().memos.filter((m: Model.Memo) => m.content.includes('comment: ' + memoId));
    }

    /**
     * 创建新的备忘录
     * 为了保持向后兼容性，保留了原有的参数形式
     */
    public async createMemo(text: string, isTask: boolean, date?: Date): Promise<Model.Memo> {
        return await waitForInsert(text, isTask, date);
    }

    /**
     * 创建新的评论备忘录
     */
    public async createCommentMemo(params: CreateCommentMemoParams): Promise<Model.Memo> {
        return await commentMemo(params.text, params.isList, params.path, params.ID, params.hasID);
    }

    /**
     * 导入备忘录
     */
    public async importMemos(text: string, isList: boolean, date: Date): Promise<Model.Memo> {
        return await waitForInsert(text, isList, date);
    }

    /**
     * 更新备忘录内容
     */
    public async updateMemo(params: UpdateMemoParams): Promise<Model.Memo> {
        return await changeMemo(
            params.memoId,
            params.originalText,
            params.text,
            params.type,
            params.path
        );
    }

    // 私有辅助方法

    /**
     * 从文本内容中提取标签
     */
    private extractTagsFromContent(content: string): string[] {
        const tags = new Set<string>();

        // 匹配不同格式的标签
        const matches = [
            ...(content.match(TAG_REG) || []),
            ...(content.match(NOP_FIRST_TAG_REG) || []),
            ...(content.match(FIRST_TAG_REG) || [])
        ];

        matches.forEach(match => {
            if (TAG_REG.test(match)) {
                tags.add(match.replace(TAG_REG, '$1').trim());
            } else if (NOP_FIRST_TAG_REG.test(match)) {
                tags.add(match.replace(NOP_FIRST_TAG_REG, '$1').trim());
            } else if (FIRST_TAG_REG.test(match)) {
                tags.add(match.replace(FIRST_TAG_REG, '$2').trim());
            }
        });

        return Array.from(tags);
    }

    /**
     * 更新store中的备忘录数据
     */
    private updateMemoStore(memos: Model.Memo[], commentMemos: Model.Memo[]): void {
        appStore.dispatch({
            type: 'SET_MEMOS',
            payload: { memos }
        });

        appStore.dispatch({
            type: 'SET_COMMENT_MEMOS',
            payload: { commentMemos }
        });
    }
}

// 导出单例实例
const memoService = new MemoService();
export default memoService;
