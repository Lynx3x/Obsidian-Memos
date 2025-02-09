# Memo时间处理重构方案

## 1. 创建TimeFormatHelper类

```typescript
class TimeFormatHelper {
  private static readonly LIST_MARKER = '^\\s*[\\-\\*]\\s';
  private static readonly TASK_MARKER = '(\\[(.{1})\\]\\s)?';
  private static readonly TIME_TAG = '(\\<time\\>)?';
  private static readonly TIME_END_TAG = '(\\<\\/time\\>)?';
  private static readonly TIME_FORMAT = '\\d{1,2}\\:\\d{2}(\\:\\d{2})?';
  private static readonly CONTENT = '[^\\n]*';

  // 基础正则构建器
  private static buildRegexPattern(withTimeTag: boolean = true, withContent: boolean = true): string {
    return [
      this.LIST_MARKER,
      this.TASK_MARKER,
      withTimeTag ? this.TIME_TAG : '',
      this.TIME_FORMAT,
      withTimeTag ? this.TIME_END_TAG : '',
      withContent ? this.CONTENT : ''
    ].join('');
  }

  // 处理DefaultMemoComposition的模式
  private static buildMemoCompositionPattern(template: string): string {
    return template.replace(
      /{TIME}/g,
      `${this.TIME_TAG}${this.TIME_FORMAT}${this.TIME_END_TAG}`
    ).replace(
      /{CONTENT}/g,
      this.CONTENT
    );
  }

  // 通用的时间提取方法
  private static extractTimeComponent(
    line: string,
    defaultComposition: string,
    componentIndex: number
  ): string | undefined {
    const pattern = defaultComposition
      ? this.buildMemoCompositionPattern(defaultComposition)
      : this.buildRegexPattern();

    const regexMatchRe = new RegExp(pattern, '');
    const match = regexMatchRe.exec(line);
    return match?.[componentIndex];
  }

  // 公共接口
  public static hasTime(line: string, defaultComposition: string = ''): boolean {
    const pattern = defaultComposition
      ? this.buildMemoCompositionPattern(defaultComposition)
      : this.buildRegexPattern();
    return new RegExp(pattern).test(line);
  }

  public static hasSeconds(line: string): boolean {
    const pattern = this.buildRegexPattern(true, false).replace(
      this.TIME_FORMAT,
      '\\d{1,2}\\:\\d{2}\\:\\d{2}'
    );
    return new RegExp(pattern).test(line);
  }

  public static extractHour(line: string, defaultComposition: string = ''): string | undefined {
    return this.extractTimeComponent(line, defaultComposition, 4); // 假设4是小时的捕获组索引
  }

  public static extractMinute(line: string, defaultComposition: string = ''): string | undefined {
    return this.extractTimeComponent(line, defaultComposition, 5); // 假设5是分钟的捕获组索引
  }

  public static extractSecond(line: string, defaultComposition: string = ''): string | undefined {
    return this.extractTimeComponent(line, defaultComposition, 6); // 假设6是秒的捕获组索引
  }

  public static extractText(line: string, defaultComposition: string = ''): string | undefined {
    return this.extractTimeComponent(line, defaultComposition, -1); // 最后一个捕获组是文本内容
  }
}
```

## 2. 重构步骤

1. 创建新的TimeFormatHelper类文件
2. 修改原有方法，使用TimeFormatHelper：
   ```typescript
   const lineContainsTime = (line: string): boolean => {
     return TimeFormatHelper.hasTime(line, DefaultMemoComposition);
   };

   const lineContainsSeconds = (line: string): boolean => {
     return TimeFormatHelper.hasSeconds(line);
   };

   const extractHourFromBulletLine = (line: string): string | undefined => {
     return TimeFormatHelper.extractHour(line, DefaultMemoComposition);
   };

   const extractMinFromBulletLine = (line: string): string | undefined => {
     return TimeFormatHelper.extractMinute(line, DefaultMemoComposition);
   };

   const extractSecondFromBulletLine = (line: string): string | undefined => {
     return TimeFormatHelper.extractSecond(line, DefaultMemoComposition);
   };

   const extractTextFromTodoLine = (line: string): string | undefined => {
     return TimeFormatHelper.extractText(line, DefaultMemoComposition);
   };
   ```

## 3. 优势

1. 正则表达式的构建被集中管理，避免重复代码
2. 通过常量定义提高可维护性
3. 统一的接口使代码更容易理解和使用
4. 更容易进行单元测试
5. 未来修改时间格式只需要修改一处代码

## 4. 后续扩展可能

1. 支持不同的时间格式配置
2. 添加时间解析和格式化功能
3. 支持更多的列表格式
4. 添加错误处理和日志记录