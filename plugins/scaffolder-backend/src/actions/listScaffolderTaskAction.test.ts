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
import { createListScaffolderTasksAction } from './listScaffolderTasksAction';
import { actionsRegistryServiceMock } from '@backstage/backend-test-utils/alpha';
import { mockServices } from '@backstage/backend-test-utils';

import { ListTasksResponse } from '../schema/openapi/generated/models/ListTasksResponse.model';
import { ScaffolderTask } from '@backstage/plugin-scaffolder-common';

describe('createListScaffolderTasksAction', () => {
  // Mocks that should be common for all tests
  const mockBaseUrl = 'http://localhost:7007/api/scaffolder';
  const mockToken = 'mock-token';

  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    mockFetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  it('should list tasks successfully', async () => {
    // Generate the mocks
    const mockActionsRegistry = actionsRegistryServiceMock();
    const mockAuth = mockServices.auth.mock();
    const mockDiscovery = mockServices.discovery.mock();
    const mockTasks = generateMockTasks();

    mockAuth.getPluginRequestToken.mockResolvedValue({ token: mockToken });
    mockDiscovery.getBaseUrl.mockResolvedValue(mockBaseUrl);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockTasks,
    });

    createListScaffolderTasksAction({
      actionsRegistry: mockActionsRegistry,
      auth: mockAuth,
      discovery: mockDiscovery,
    });

    const result = await mockActionsRegistry.invoke({
      id: 'test:list-scaffolder-tasks',
      input: {},
    });

    const expectedTasks: ScaffolderTask[] = mockTasks.tasks.map(task => ({
      id: task.id,
      spec: task.spec,
      status: task.status,
      createdAt: task.createdAt,
      lastHeartbeatAt: task.lastHeartbeatAt,
    }));

    expect(result.output).toEqual({
      tasks: expectedTasks,
      totalTasks: mockTasks.totalTasks,
    });
  });

  it('should throw an error if the API call fails', async () => {
    // Generate the mocks
    const mockActionsRegistry = actionsRegistryServiceMock();
    const mockAuth = mockServices.auth.mock();
    const mockDiscovery = mockServices.discovery.mock();

    mockAuth.getPluginRequestToken.mockResolvedValue({ token: mockToken });
    mockDiscovery.getBaseUrl.mockResolvedValue(mockBaseUrl);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    createListScaffolderTasksAction({
      actionsRegistry: mockActionsRegistry,
      auth: mockAuth,
      discovery: mockDiscovery,
    });

    await expect(
      mockActionsRegistry.invoke({
        id: 'test:list-scaffolder-tasks',
        input: {},
      }),
    ).rejects.toThrow(`Internal Server Error`);
  });
});

// Return an mocked ListTasksResponse that contains a number of different mocked tasks
function generateMockTasks(): ListTasksResponse {
  return {
    tasks: [
      {
        id: 'task-1',
        spec: {},
        status: 'completed',
        createdAt: '2025-01-01T00:00:00Z',
        lastHeartbeatAt: '2025-01-01T00:01:00Z',
        createdBy: 'user:default/guest',
      },
      {
        id: 'task-2',
        spec: {},
        status: 'completed',
        createdAt: '2025-01-01T00:00:00Z',
        lastHeartbeatAt: '2025-01-01T00:01:00Z',
        createdBy: 'user:default/guest',
      },
      {
        id: 'task-3',
        spec: {},
        status: 'processing',
        createdAt: '2025-01-01T00:00:00Z',
        lastHeartbeatAt: '2025-01-01T00:02:00Z',
        createdBy: 'user:default/admin',
      },
      {
        id: 'task-4',
        spec: {},
        status: 'failed',
        createdAt: '2025-01-01T00:00:00Z',
        lastHeartbeatAt: '2025-01-01T00:02:00Z',
        createdBy: 'user:default/admin',
      },
      {
        id: 'task-5',
        spec: {},
        status: 'cancelled',
        createdAt: '2025-01-01T00:00:00Z',
        lastHeartbeatAt: '2025-01-01T00:02:00Z',
        createdBy: 'user:default/admin',
      },
    ],
    totalTasks: 5,
  };
}
