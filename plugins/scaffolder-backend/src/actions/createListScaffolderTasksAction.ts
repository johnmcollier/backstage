/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import { AuthService, DiscoveryService } from '@backstage/backend-plugin-api';
import { ScaffolderTask } from '@backstage/plugin-scaffolder-common';
import { ListTasksResponse } from '../schema/openapi/generated/models/ListTasksResponse.model';
import { ResponseError } from '@backstage/errors';

export const createListScaffolderTasksAction = ({
  actionsRegistry,
  auth,
  discovery,
}: {
  actionsRegistry: ActionsRegistryService;
  auth: AuthService;
  discovery: DiscoveryService;
}) => {
  actionsRegistry.register({
    name: 'list-scaffolder-tasks',
    title: 'List Scaffolder Tasks',
    attributes: {
      destructive: false,
      readOnly: true,
      idempotent: true,
    },
    description: `
This allows you to list scaffolder tasks that have been created.
Each task has a unique id, specification, and status (one of open, processing, completed, failed, cancelled, stale).
Each task also has timestaps relating to when the task was created and updated.
    `,
    schema: {
      input: z =>
        z.object({
          id: z
            .string()
            .describe('The unique identifier of the task to query')
            .optional(),
          status: z
            .enum([
              'open',
              'processing',
              'completed',
              'failed',
              'cancelled',
              'stale',
            ])
            .describe('The status of the tasks to filter on')
            .optional(),
          createdBy: z
            .string()
            .describe(
              'The task creator to filter on (in entity referene format)',
            )
            .optional(),
          limit: z
            .number()
            .describe('The maximum number of tasks to return for pagination')
            .optional(),
          offset: z
            .number()
            .describe('The offset to start from for pagination')
            .optional(),
        }),
      // TODO: is there a better way to do this?
      output: z =>
        z.object({
          tasks: z
            .array(z.custom<ScaffolderTask>())
            .describe('The list of tasks'),
          totalTasks: z
            .number()
            .optional()
            .describe(
              'Total number of tasks matching the filter (for pagination)',
            ),
        }),
    },
    action: async ({ input, credentials }) => {
      // Retrieve a token to query the scaffolder api
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'scaffolder',
      });

      const baseUrl = await discovery.getBaseUrl('scaffolder');
      let tasksUrl: string = `${baseUrl}/v2/tasks`;

      // Build the query parameters
      const params = new URLSearchParams();
      if (input.id) {
        // ToDo: Better way to build the URL?
        tasksUrl += `/${input.id}`;
        params.append('id', input.id);
      }
      if (input.status) {
        params.append('status', input.status);
      }
      if (input.createdBy) {
        params.append('createdBy', input.createdBy);
      }

      // Pagination
      if (input.limit) {
        params.append('limit', String(input.limit));
      }
      if (input.offset) {
        params.append('offset', String(input.offset));
      }

      // Is there a better way to fetch tasks?
      // TaskBroker is deprecated and will be (is?) removed, so we can't use that
      // But hitting the API directly feels messy
      const response = await fetch(`${tasksUrl}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw await ResponseError.fromResponse(response);
      }

      const data: ListTasksResponse = await response.json();

      return {
        output: {
          // Convert the SerializedTask objects to ScaffolderTasks
          // We can't directly return the SerializedTask objects as we don't want the secrets object in SerializedTask exposed
          tasks: data.tasks.map(task => ({
            id: task.id,
            spec: task.spec,
            status: task.status,
            createdAt: task.createdAt,
            lastHeartbeatAt: task.lastHeartbeatAt,
          })),
          totalTasks: data.totalTasks,
        },
      };
    },
  });
};
