"use client";

import { Table } from "react-bootstrap";
import { FaUserCircle } from "react-icons/fa";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import * as coursesClient from "../../../client";
import { User } from "../../../../types";

export default function PeopleTable() {
  const { cid } = useParams();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (cid) {
        try {
          const courseUsers = await coursesClient.findUsersForCourse(cid as string);
          // Filter out any null/undefined users and ensure they have required fields
          const validUsers = courseUsers.filter((user: User | null | undefined): user is User => 
            user != null && 
            user._id != null && 
            user.firstName != null && 
            user.lastName != null
          );
          setUsers(validUsers);
        } catch (error) {
          console.error("Error fetching users:", error);
          setUsers([]);
        }
      }
    };
    fetchUsers();
  }, [cid]);

  return (
    <div id="wd-people-table">
      <Table striped>
        <thead>
          <tr>
            <th>Name</th>
            <th>Login ID</th>
            <th>Section</th>
            <th>Role</th>
            <th>Last Activity</th>
            <th>Total Activity</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td className="wd-full-name text-nowrap">
                <FaUserCircle className="me-2 fs-1 text-secondary" />
                <span className="wd-first-name">{user.firstName || ""}</span>{" "}
                <span className="wd-last-name">{user.lastName || ""}</span>
              </td>
              <td className="wd-login-id">{user.loginId || ""}</td>
              <td className="wd-section">{user.section || ""}</td>
              <td className="wd-role">{user.role || ""}</td>
              <td className="wd-last-activity">{user.lastActivity || ""}</td>
              <td className="wd-total-activity">{user.totalActivity || ""}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
