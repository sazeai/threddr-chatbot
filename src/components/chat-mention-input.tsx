"use client";
import React, { RefObject, useCallback, useMemo } from "react";

import { HammerIcon } from "lucide-react";
import { MCPIcon } from "ui/mcp-icon";

import { ChatMention } from "app-types/chat";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "ui/command";

import MentionInput from "./mention-input";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import { createPortal } from "react-dom";
import { appStore } from "@/app/store";
import { cn, toAny } from "lib/utils";
import { useShallow } from "zustand/shallow";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Editor } from "@tiptap/react";
import { DefaultToolName } from "lib/ai/tools";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { DefaultToolIcon } from "./default-tool-icon";

interface ChatMentionInputProps {
  onChange: (text: string) => void;
  onChangeMention: (mentions: ChatMention[]) => void;
  onEnter?: () => void;
  placeholder?: string;
  input: string;
  ref?: RefObject<Editor | null>;
}

export default function ChatMentionInput({
  onChange,
  onChangeMention,
  onEnter,
  placeholder,
  ref,
  input,
}: ChatMentionInputProps) {
  const handleChange = useCallback(
    ({
      text,
      mentions,
    }: { text: string; mentions: { label: string; id: string }[] }) => {
      onChange(text);
      onChangeMention(
        mentions.map((mention) => JSON.parse(mention.id) as ChatMention),
      );
    },
    [onChange, onChangeMention],
  );

  return (
    <MentionInput
      content={input}
      onEnter={onEnter}
      placeholder={placeholder}
      suggestionChar="@"
      onChange={handleChange}
      MentionItem={ChatMentionInputMentionItem}
      Suggestion={ChatMentionInputSuggestion}
      editorRef={ref}
    />
  );
}

export function ChatMentionInputMentionItem({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const item = useMemo(() => JSON.parse(id) as ChatMention, [id]);
  const label = useMemo(() => {
    return (
      <div
        className={cn(
          "flex items-center text-sm px-1 font-semibold transition-colors",
          "text-blue-500",
          className,
        )}
      >
        {toAny(item).label || item.name}
      </div>
    );
  }, [item]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent className="p-4 whitespace-pre-wrap max-w-xs">
        {item.description || "mention"}
      </TooltipContent>
    </Tooltip>
  );
}

function ChatMentionInputSuggestion({
  onSelectMention,
  onClose,
  top,
  left,
}: {
  onClose: () => void;
  onSelectMention: (item: { label: string; id: string }) => void;
  top: number;
  left: number;
}) {
  const t = useTranslations("Common");
  const [mcpList, workflowList] = appStore(
    useShallow((state) => [state.mcpList, state.workflowToolList]),
  );

  const mcpMentions = useMemo(() => {
    return mcpList
      ?.filter((mcp) => mcp.toolInfo?.length)
      .map((mcp) => {
        return (
          <CommandGroup heading={mcp.name} key={mcp.id}>
            <CommandItem
              key={`${mcp.id}-mcp`}
              className="cursor-pointer text-foreground"
              onSelect={() =>
                onSelectMention({
                  label: `mcp("${mcp.name}")`,
                  id: JSON.stringify({
                    type: "mcpServer",
                    name: mcp.name,
                    serverId: mcp.id,
                    description: `${mcp.name} is an MCP server that includes ${mcp.toolInfo?.length ?? 0} tool(s).`,
                    toolCount: mcp.toolInfo?.length ?? 0,
                  }),
                })
              }
            >
              <MCPIcon className="size-3.5 text-foreground" />
              <span className="truncate min-w-0">{mcp.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {mcp.toolInfo?.length} tools
              </span>
            </CommandItem>
            {mcp.toolInfo?.map((tool) => {
              return (
                <CommandItem
                  key={`${mcp.id}-${tool.name}`}
                  className="cursor-pointer text-foreground"
                  onSelect={() =>
                    onSelectMention({
                      label: `tool("${tool.name}") `,
                      id: JSON.stringify({
                        type: "mcpTool",
                        name: tool.name,
                        serverId: mcp.id,
                        description: tool.description,
                        serverName: mcp.name,
                      }),
                    })
                  }
                >
                  <HammerIcon className="size-3.5" />
                  <span className="truncate min-w-0">{tool.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        );
      });
  }, [mcpList]);

  const workflowMentions = useMemo(() => {
    if (!workflowList.length) return;
    return (
      <CommandGroup heading="Workflows" key="workflows">
        {workflowList.map((workflow) => {
          return (
            <CommandItem
              key={workflow.id}
              className="cursor-pointer text-foreground"
              onSelect={() =>
                onSelectMention({
                  label: `tool("${workflow.name}")`,
                  id: JSON.stringify({
                    type: "workflow",
                    name: workflow.name,
                    workflowId: workflow.id,
                    icon: workflow.icon,
                    description: workflow.description,
                  }),
                })
              }
            >
              <Avatar
                style={workflow.icon?.style}
                className="size-3.5 ring-[1px] ring-input rounded-full"
              >
                <AvatarImage src={workflow.icon?.value} />
                <AvatarFallback>{workflow.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="truncate min-w-0">{workflow.name}</span>
            </CommandItem>
          );
        })}
      </CommandGroup>
    );
  }, [workflowList]);

  const defaultToolMentions = useMemo(() => {
    const items = Object.values(DefaultToolName).map((toolName) => {
      let label = toolName as string;
      const icon = <DefaultToolIcon name={toolName} />;
      let description = "";
      switch (toolName) {
        case DefaultToolName.CreatePieChart:
          label = "pie-chart";
          description = "Create a pie chart";
          break;
        case DefaultToolName.CreateBarChart:
          label = "bar-chart";
          description = "Create a bar chart";
          break;
        case DefaultToolName.CreateLineChart:
          label = "line-chart";
          description = "Create a line chart";
          break;
        case DefaultToolName.WebSearch:
          label = "web-search";
          description = "Search the web";
          break;
        case DefaultToolName.WebContent:
          label = "web-content";
          description = "Get the content of a web page";
          break;
        case DefaultToolName.Http:
          label = "HTTP";
          description = "Send an http request";
          break;
        case DefaultToolName.JavascriptExecution:
          label = "js-execution";
          description = "Execute simple javascript code";
          break;
        case DefaultToolName.PythonExecution:
          label = "python-execution";
          description = "Execute simple python code";
          break;
      }
      return {
        id: toolName,
        label,
        icon,
        description,
      };
    });

    return (
      <>
        <CommandGroup heading="App Tools" key="default-tool">
          {items.map((item) => {
            return (
              <CommandItem
                key={item.id}
                onSelect={() =>
                  onSelectMention({
                    label: `tool('${item.label}')`,
                    id: JSON.stringify({
                      type: "defaultTool",
                      name: item.id,
                      label: item.label,
                      description: item.description,
                    }),
                  })
                }
              >
                {item.icon}
                <span className="truncate min-w-0">{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </>
    );
  }, []);

  return createPortal(
    <Popover open onOpenChange={(f) => !f && onClose()}>
      <PopoverTrigger asChild>
        <span
          className="fixed z-50"
          style={{
            top,
            left,
          }}
        ></span>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-xs" align="start" side="top">
        <Command>
          <CommandInput
            onKeyDown={(e) => {
              if (e.key == "Backspace" && !e.currentTarget.value) {
                onClose();
              }
            }}
            placeholder={t("search")}
          />
          <CommandList className="p-2">
            <CommandEmpty>{t("noResults")}</CommandEmpty>
            {workflowMentions}
            {defaultToolMentions}
            {mcpMentions}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>,
    document.body,
  );
}
